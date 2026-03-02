import React, { useState, useEffect, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";

const API_URL = import.meta.env.VITE_API_URL || "https://ai-stylist-production-7f72.up.railway.app";

// --- КОНСТАНТЫ (СЛОВАРИ) ДЛЯ СТАНДАРТИЗАЦИИ БАЗЫ ---
const CATEGORIES = ["Верх", "Низ", "Обувь", "Верхняя одежда", "Аксессуары", "Сумка"];
const COLORS = ["Черный", "Белый", "Серый", "Бежевый", "Синий", "Голубой", "Красный", "Зеленый", "Коричневый", "Желтый", "Розовый", "Разноцветный"];
const MATERIALS = ["Хлопок", "Деним", "Шерсть", "Кожа", "Лен", "Синтетика", "Шелк", "Трикотаж", "Смесовая ткань", "Неизвестно"];
const SEASONS = ["Лето", "Зима", "Демисезон", "Мультисезон"];

const onboardingStories = [
  { id: 1, icon: "✨", title: "ИИ-Стилист", text: "Загрузите фото, и нейросеть разберет ваш образ на детали, оценив стиль и цветовое сочетание." },
  { id: 2, icon: "📱", title: "Умный шкаф", text: "Оцифруйте свою одежду один раз. Забудьте о проблеме «нечего надеть» навсегда." },
  { id: 3, icon: "💸", title: "Метрика CPW", text: "Мы считаем стоимость каждого выхода вещи (Cost Per Wear). Экономьте на покупках с умом." },
  { id: 4, icon: "🚀", title: "Безлимит", text: "Попробуйте генерацию луков прямо сейчас! Без регистрации мы используем базу типичного гардероба." }
];

const initialItemState = { category: "Верх", subcategory: "", color_primary: "Черный", material: "Хлопок", style: "Casual", price: "", seasons: "Мультисезон", occasions: "", image_url: null };

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [wardrobe, setWardrobe] = useState([]);
  const [activeTab, setActiveTab] = useState("home"); 
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadedLook, setUploadedLook] = useState(null);
  const [activeStory, setActiveStory] = useState(null); 
  const [favorites, setFavorites] = useState([]); 
  const recognitionRef = useRef(null);

  const [imageBase64, setImageBase64] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [aiVerdict, setAiVerdict] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState("");

  const [preferences, setPreferences] = useState([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Состояния формы (CRUD)
  const [item, setItem] = useState(initialItemState);
  const [editingId, setEditingId] = useState(null);

  // НОВОЕ СОСТОЯНИЕ: Для сканирования вещи
  const itemPhotoInputRef = useRef(null);
  const [isScanningItem, setIsScanningItem] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [personPhoto, setPersonPhoto] = useState(null);
  const [isAnalyzingPerson, setIsAnalyzingPerson] = useState(false);
  const [personAnalysis, setPersonAnalysis] = useState("");
  const personPhotoRef = useRef(null);
  const [personImageBase64, setPersonImageBase64] = useState(null);

  const [isTryingOn, setIsTryingOn] = useState(false);
  const [tryOnResult, setTryOnResult] = useState(null);


  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.style_preferences) setPreferences(parsedUser.style_preferences);
      fetchWardrobe();
    }
  }, [token]);

  useEffect(() => {
    if (token) return;
    if (activeTab === "profile") {
      const initGoogle = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (window.google?.accounts?.id && clientId) {
          window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleLogin });
          const btn = document.getElementById("googleSignInDiv");
          if (btn) window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large" });
        }
      };
      const interval = setInterval(() => {
        if (window.google?.accounts?.id && document.getElementById("googleSignInDiv")) {
          initGoogle();
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [token, activeTab]);

  const handleGoogleLogin = async (response) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        if (data.user.style_preferences) setPreferences(data.user.style_preferences);
        setActiveTab("wardrobe"); 
      }
    } catch (err) { console.error("Login error:", err); }
  };

  const fetchWardrobe = async () => {
    try {
      const res = await fetch(`${API_URL}/wardrobe`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Fetch error:", err); }
  };

// --- МАГИЯ: ДОБАВЛЕНИЕ ГОЛОСОМ (С РУЧНЫМ УПРАВЛЕНИЕМ) ---
const handleVoiceAdd = () => {
  // 1. Если мы УЖЕ слушаем, то по клику ОСТАНАВЛИВАЕМ запись и запускаем ИИ
  if (isListening && recognitionRef.current) {
    recognitionRef.current.stop();
    return; // Выходим, дальше сработает событие onresult
  }

  // 2. Иначе начинаем слушать
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Ваш браузер не поддерживает голосовой ввод. Попробуйте Chrome или Safari.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognitionRef.current = recognition; // Сохраняем микрофон в память
  recognition.lang = 'ru-RU'; 
  recognition.interimResults = false;
  
  recognition.onstart = () => setIsListening(true);
  
  recognition.onerror = (event) => {
    console.error("Speech error", event);
    setIsListening(false);
    // Игнорируем системную ошибку "aborted", когда мы сами жмем Стоп
    if (event.error !== 'aborted') { 
      alert("Ошибка микрофона. Убедитесь, что вы разрешили доступ.");
    }
  };
  
  recognition.onend = () => setIsListening(false);

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    setIsScanningItem(true); 
    
    try {
      const res = await fetch(`${API_URL}/api/parse-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: transcript })
      });
      
      const data = await res.json();

      if (res.ok && data.items && data.items.length > 0) {
        const itemNames = data.items.map(i => `${i.color_primary} ${i.subcategory}`).join(', ');
        
        if (window.confirm(`Вы сказали: "${transcript}"\n\nИИ распознал:\n${itemNames}.\n\nДобавить в гардероб?`)) {
          for (const found of data.items) {
            const payload = {
              category: found.category || "Верх",
              subcategory: found.subcategory || "Вещь",
              color_primary: found.color_primary || "Черный",
              material: found.material || "Хлопок",
              style: "Casual",
              purchase_price: 0,
              seasons: [found.seasons || "Мультисезон"],
              occasions: [],
              image_url: null 
            };
            await fetch(`${API_URL}/wardrobe`, {
              method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(payload)
            });
          }
          fetchWardrobe(); 
          alert("✅ Вещи добавлены!");
        }
      } else {
        alert("ИИ не смог найти одежду в вашем тексте.");
      }
    } catch (error) {
      alert("Ошибка связи с сервером.");
    } finally {
      setIsScanningItem(false);
    }
  };

  recognition.start(); 
};

  // --- МАГИЯ: Распознавание вещи по фото ---
  const handleItemPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanningItem(true);
    
    try {
      // 1. ВЫРЕЗАЕМ ФОН ПРЯМО В БРАУЗЕРЕ (0 рублей!)
      const transparentBlob = await removeBackground(file);

      // 2. Переводим результат в Base64
      const reader = new FileReader();
      reader.readAsDataURL(transparentBlob);
      reader.onloadend = async () => {
        try {
          // 3. Отправляем чистую картинку ИИ для распознавания параметров
          const res = await fetch(`${API_URL}/api/auto-tag-item`, {
            method: "POST", 
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ imageBase64: reader.result })
          });
          
          const data = await res.json();
          
          if (res.ok) {
            setItem(prev => ({ 
              ...prev, 
              category: data.item.category || prev.category, 
              subcategory: data.item.subcategory || prev.subcategory, 
              color_primary: data.item.color_primary || prev.color_primary, 
              material: data.item.material || prev.material, 
              seasons: data.item.seasons || prev.seasons, 
              image_url: data.imageUrl 
            }));
            alert("✨ ИИ успешно распознал вещь и очистил фон!");
          } else { alert(`Ошибка сервера: ${data.error}`); }
        } catch (error) { 
          console.error(error);
          alert("Не удалось связаться с сервером ИИ."); 
        } finally { 
          setIsScanningItem(false); 
        }
      };
    } catch (error) {
      console.error("Ошибка удаления фона:", error);
      alert("Не удалось удалить фон. Попробуйте загрузить фото меньшего размера.");
      setIsScanningItem(false);
    }
  };

  // --- CRUD: СОЗДАНИЕ И ОБНОВЛЕНИЕ ВЕЩИ ---
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!item.category || !user) return;
    setLoading(true);

    const formattedSeasons = item.seasons ? item.seasons.split(",").map(s => s.trim()).filter(Boolean) : [];
    const formattedOccasions = item.occasions ? item.occasions.split(",").map(o => o.trim()).filter(Boolean) : [];

    const payload = { ...item, purchase_price: parseFloat(item.price) || 0, seasons: formattedSeasons, occasions: formattedOccasions };
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `${API_URL}/wardrobe/${editingId}` : `${API_URL}/wardrobe`;

    try {
      const res = await fetch(endpoint, {
        method: method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (res.status === 403) { alert(`⛔ Лимит: ${data.error}`); return; }
      if (res.ok) {
        setItem(initialItemState); // Сброс формы
        setEditingId(null);
        fetchWardrobe(); // Обновляем список
      } else { alert(`Ошибка: ${data.error}`); }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  // --- CRUD: УДАЛЕНИЕ ---
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Точно удалить эту вещь из гардероба?")) return;
    try {
      const res = await fetch(`${API_URL}/wardrobe/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchWardrobe();
    } catch (err) { console.error(err); }
  };

  // --- НАЖАТИЕ НА КНОПКУ РЕДАКТИРОВАТЬ ---
  const handleEditClick = (itemToEdit) => {
    setItem({
      category: itemToEdit.category,
      subcategory: itemToEdit.subcategory || "",
      color_primary: itemToEdit.color_primary || "Черный",
      material: itemToEdit.material || "Хлопок",
      style: itemToEdit.style || "Casual",
      price: itemToEdit.purchase_price || "",
      seasons: itemToEdit.seasons && itemToEdit.seasons.length > 0 ? itemToEdit.seasons.join(", ") : "Мультисезон",
      occasions: itemToEdit.occasions ? itemToEdit.occasions.join(", ") : "",
      image_url: itemToEdit.image_url || null
    });
    setEditingId(itemToEdit.id);
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  };

  const handleCancelEdit = () => {
    setItem(initialItemState);
    setEditingId(null);
  };

  const handleLogout = () => {
    localStorage.clear(); setToken(null); setUser(null); setWardrobe([]); setPreferences([]); setActiveTab("home");
  };

  const toggleStyle = (styleId) => {
    setPreferences(prev => prev.includes(styleId) ? prev.filter(id => id !== styleId) : [...prev, styleId]);
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch(`${API_URL}/api/user/preferences`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user); localStorage.setItem("user", JSON.stringify(data.user)); alert("Предпочтения сохранены!");
      }
    } catch (err) { alert("Ошибка при сохранении."); } finally { setIsSavingPrefs(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiVerdict(""); setIsAnalyzing(false); setUploadedLook(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => { setImageBase64(reader.result); };
  };

  const sendForAnalysis = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true); setAiVerdict("");
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: imageBase64 }),
      });
      const data = await res.json();
      if (res.ok) { setAiVerdict(data.verdict); } else { setAiVerdict(`❌ Ошибка ИИ: ${data.error}`); }
    } catch (err) { setAiVerdict("❌ Ошибка соединения с сервером."); } finally { setIsAnalyzing(false); }
  };

  // --- ГЕНЕРАЦИЯ ОБРАЗА ---
  const handleGenerateOutfit = async (selectedOccasion) => {
    setIsGenerating(true);
    setGeneratedOutfit(null);
    setTryOnResult(null); // Очищаем прошлую примерку
    
    try {
      const res = await fetch(`${API_URL}/api/generate-outfit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ occasion: selectedOccasion, wardrobe, preferences: user?.style_preferences || [] })
      });
      const data = await res.json();
      
      if (res.ok) setGeneratedOutfit(data); // Теперь тут объект {text, top_item_id, bottom_item_id}
      else alert("Ошибка сервера: " + data.error);
    } catch (error) { 
      alert("Ошибка связи со стилистом."); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  // --- МАГИЯ: ЗАПУСК ПРИМЕРОЧНОЙ ---
  const handleTryOn = async (itemId) => {
    // Ищем вещь в шкафу, чтобы взять её картинку
    const item = wardrobe.find(i => i.id === itemId);
    if (!item || !item.image_url) {
      return alert("У этой вещи нет фотографии (или фон не был удален)!");
    }

    setIsTryingOn(true);
    try {
      const res = await fetch(`${API_URL}/api/try-on`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ garmentUrl: item.image_url })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTryOnResult(data.resultUrl);
      } else {
        alert(data.error || "Ошибка примерки. Возможно, вы не загрузили свое фото в Профиле.");
      }
    } catch (error) {
      alert("Сервер Hugging Face сейчас перегружен. Попробуйте еще раз через минуту!");
    } finally {
      setIsTryingOn(false);
    }
  };

  // --- ВЫБОР ФОТО ДЛЯ ПРОФИЛЯ (БЕЗ ОТПРАВКИ) ---
  const handlePersonPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setPersonPhoto(URL.createObjectURL(file));
    setPersonAnalysis(""); // Очищаем прошлый анализ
    setPersonImageBase64(null);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setPersonImageBase64(reader.result); // Сохраняем базу, но ждем клика по кнопке
    };
  };

  // --- ОТПРАВКА ФОТО НА АНАЛИЗ ИИ ---
  const handleAnalyzePerson = async () => {
    if (!personImageBase64) return;
    setIsAnalyzingPerson(true);
    
    try {
      const res = await fetch(`${API_URL}/api/analyze-person`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: personImageBase64 })
      });
      
      const data = await res.json();
      
      if (res.ok && data.user) {
        setPersonAnalysis(data.user.style_analysis);
        // Обновляем глобального юзера, чтобы результат сохранился в приложении!
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        alert("Ошибка сервера: " + (data.error || "Неизвестная ошибка"));
      }
    } catch (err) {
      alert("Ошибка соединения с ИИ");
    } finally {
      setIsAnalyzingPerson(false);
    }
  };

  const renderHome = () => (
    <div style={contentStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{token ? `Привет, ${user?.name?.split(' ')[0]}! 👋` : 'Стиль от ИИ 👋'}</h2>
          <p style={{ margin: 0, opacity: 0.6, fontSize: '14px' }}>{token ? 'Готов сиять сегодня?' : 'Оцени свой лук бесплатно'}</p>
        </div>
        {user?.picture && <img src={user.picture} alt="Avatar" style={{ width: '40px', borderRadius: '50%', border: '2px solid #00e6b8' }} />}
      </div>

      <div style={storiesContainerStyle}>
        {onboardingStories.map(story => (
          <div key={story.id} style={storyCircleWrapperStyle} onClick={() => setActiveStory(story)}>
            <div style={storyCircleStyle}>{story.icon}</div>
            <span style={storyTitleStyle}>{story.title}</span>
          </div>
        ))}
      </div>

      {activeStory && (
        <div style={storyModalOverlayStyle} onClick={() => setActiveStory(null)}>
          <div style={storyModalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>{activeStory.icon}</div>
            <h3>{activeStory.title}</h3>
            <p style={{ opacity: 0.8, lineHeight: '1.5' }}>{activeStory.text}</p>
            <button onClick={() => setActiveStory(null)} style={{...buttonStyle(false), marginTop: '20px', width: '100%'}}>Понятно</button>
          </div>
        </div>
      )}

      <div style={aiBannerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '40px' }}>✨</div>
          <div><h3 style={{ margin: '0 0 5px 0' }}>Оценить образ</h3><p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Нейросеть разберет ваш лук</p></div>
        </div>
        
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
        
        {!uploadedLook && (
          <button onClick={() => fileInputRef.current.click()} style={{ ...buttonStyle(false), width: '100%', marginTop: '15px', background: '#fff' }}>📸 Выбрать фото</button>
        )}

        {uploadedLook && (
          <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={uploadedLook} alt="Мой лук" style={{ width: '100%', borderRadius: '8px', marginBottom: '15px', maxHeight: '400px', objectFit: 'cover' }} />
            {!isAnalyzing && !aiVerdict && (
               <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button onClick={() => fileInputRef.current.click()} style={{ ...buttonStyle(false), flex: 1, background: '#333', color: '#fff', fontSize: '14px' }}>🔄 Заменить</button>
                  <button onClick={sendForAnalysis} style={{ ...buttonStyle(false), flex: 2, fontSize: '14px' }}>✨ Отправить</button>
               </div>
            )}
            {isAnalyzing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0b0c10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path>
                </svg>
                <span style={{ fontWeight: 'bold', color: '#0b0c10' }}>Стилист разбирает образ...</span>
              </div>
            )}
            {aiVerdict && !isAnalyzing && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '14px', color: '#0b0c10', whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: '1.6', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>{aiVerdict}</div>
                <button onClick={() => { setUploadedLook(null); setAiVerdict(""); setImageBase64(null); }} style={{...buttonStyle(false), width: '100%', marginTop: '15px', background: '#0b0c10', color: '#00e6b8'}}>Разобрать другой образ</button>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Подобрать образ для:</h3>
      <div style={gridStyle}>
        <div style={occasionCardStyle} onClick={() => handleGenerateOutfit("Офис и деловая встреча")}><div style={iconCircleStyle}>💼</div><span style={{ fontWeight: 'bold' }}>Работа</span></div>
        <div style={occasionCardStyle} onClick={() => handleGenerateOutfit("Яркая вечеринка или клуб")}><div style={iconCircleStyle}>🪩</div><span style={{ fontWeight: 'bold' }}>Вечеринка</span></div>
        <div style={occasionCardStyle} onClick={() => handleGenerateOutfit("Стильная и комфортная прогулка по городу")}><div style={iconCircleStyle}>👟</div><span style={{ fontWeight: 'bold' }}>Прогулка</span></div>
        <div style={occasionCardStyle} onClick={() => handleGenerateOutfit("Вечернее мероприятие, ресторан или театр")}><div style={iconCircleStyle}>🥂</div><span style={{ fontWeight: 'bold' }}>Мероприятие</span></div>
      </div>

      {(isGenerating || generatedOutfit) && (
        <div style={{ marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, #151822 0%, #1c1f26 100%)', borderRadius: '16px', border: '1px solid #00e6b8' }}>
          {isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00e6b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path>
              </svg>
              <span style={{ color: '#00e6b8', fontWeight: 'bold' }}>ИИ-стилист собирает капсулу...</span>
            </div>
          ) : (
            <>
              {/* Текст от ИИ */}
              <div style={{ fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {generatedOutfit.text || generatedOutfit}
              </div>

              {/* Кнопка примерки (показываем, если ИИ выбрал верх из шкафа и у него есть фото) */}
              {generatedOutfit.top_item_id && wardrobe.find(i => i.id === generatedOutfit.top_item_id)?.image_url && (
                <div style={{ marginTop: '20px', padding: '15px', background: '#111', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa' }}>
                    Хотите увидеть, как эта вещь сидит на вас?
                  </p>
                  <button 
                    onClick={() => handleTryOn(generatedOutfit.top_item_id)}
                    disabled={isTryingOn}
                    style={{
                      background: isTryingOn ? '#555' : '#00e6b8', 
                      color: isTryingOn ? '#aaa' : '#000', 
                      border: 'none', borderRadius: '8px', padding: '12px', width: '100%', fontSize: '14px', fontWeight: 'bold', cursor: isTryingOn ? 'not-allowed' : 'pointer', transition: '0.3s'
                    }}
                  >
                    {isTryingOn ? "⏳ ИИ шьет одежду (около 30-40 сек)..." : "👕 Примерить этот верх на себя"}
                  </button>
                </div>
              )}

              {/* Результат примерки (Фото) */}
              {tryOnResult && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>📸 Готово! Вот как это выглядит:</h4>
                  <img src={tryOnResult} alt="Результат примерки" style={{ width: '100%', borderRadius: '12px', border: '2px solid #00e6b8' }} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderLoginPrompt = (title, icon) => (
    <div style={contentStyle}>
      <h2>{title}</h2>
      <div style={{ ...cardStyle, textAlign: 'center', marginTop: '40px', padding: '40px 20px' }}>
        <div style={{ fontSize: '50px', marginBottom: '15px' }}>{icon}</div>
        <h3>Требуется профиль</h3>
        <p style={{ opacity: 0.7, marginBottom: '30px' }}>Чтобы сохранять вещи и луки, войдите в систему.</p>
        <button onClick={() => setActiveTab("profile")} style={buttonStyle(false)}>Перейти ко входу</button>
      </div>
    </div>
  );

  const renderWardrobe = () => {
    if (!token) return <div style={contentStyle}><h2>Гардероб</h2><button onClick={() => setActiveTab("profile")} style={buttonStyle(false)}>Войти в систему</button></div>;
    return (
      <div style={contentStyle}>
        <h2>Гардероб</h2>
        
        <div style={{...cardStyle, border: editingId ? '1px solid #00e6b8' : '1px solid #222'}}>
          
          {/* --- НАЧАЛО ОБНОВЛЕННОГО БЛОКА С КНОПКАМИ --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>{editingId ? "✏️ Редактировать" : "➕ Добавить"}</h3>
            
            {/* Контейнер для двух кнопок: Фото и Голос */}
            <div style={{ display: 'flex', gap: '8px' }}>
              
              {/* Скрытый инпут и кнопка для Фото */}
              <input type="file" accept="image/*" ref={itemPhotoInputRef} onChange={handleItemPhotoSelect} style={{ display: 'none' }} />
              <button 
                type="button" 
                onClick={() => itemPhotoInputRef.current.click()} 
                disabled={isScanningItem || isListening} 
                style={{ background: '#00e6b8', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isScanningItem ? "⏳..." : "📸 Фото"}
              </button>
              
              {/* НОВАЯ КНОПКА МИКРОФОНА */}
              <button 
                type="button" 
                onClick={handleVoiceAdd} 
                disabled={isScanningItem} 
                style={{ background: isListening ? '#ff4d4d' : '#333', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
              >
                {isListening ? "🔴 Слушаю..." : "🎙️ Голос"}
              </button>

            </div>
          </div>
          {/* --- КОНЕЦ ОБНОВЛЕННОГО БЛОКА --- */}

          <form onSubmit={handleAddItem} style={formStyle}>
            <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} style={inputStyle} required>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input placeholder="Что это? (Худи, Джинсы) *" value={item.subcategory} onChange={e => setItem({...item, subcategory: e.target.value})} style={inputStyle} required />
            <select value={item.color_primary} onChange={e => setItem({...item, color_primary: e.target.value})} style={inputStyle} required>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={item.material} onChange={e => setItem({...item, material: e.target.value})} style={inputStyle}>{MATERIALS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input placeholder="Цена (₽) *" type="number" value={item.price} onChange={e => setItem({...item, price: e.target.value})} style={inputStyle} required />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {editingId && <button type="button" onClick={() => {setItem(initialItemState); setEditingId(null)}} style={{...buttonStyle(false), flex: 1, background: '#333', color: '#fff'}}>Отмена</button>}
              <button type="submit" disabled={loading} style={{...buttonStyle(loading), flex: 2}}>{loading ? "..." : (editingId ? "Обновить" : "В шкаф")}</button>
            </div>
          </form>
        </div>

        <div style={gridStyle}>
          {wardrobe.map(i => (
            <div key={i.id} style={{...itemCardStyle, position: 'relative', overflow: 'hidden'}}>
              {i.image_url && (
                 <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '8px', padding: '10px', display: 'flex', justifyContent: 'center' }}>
                   <img src={i.image_url} alt="Вещь" style={{ width: '100%', height: '120px', objectFit: 'contain' }} />
                 </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: "bold" }}>{i.subcategory || i.category}</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => handleEditClick(i)} style={iconBtnStyle}>✏️</button>
                  <button onClick={() => handleDeleteItem(i.id)} style={iconBtnStyle}>🗑</button>
                </div>
              </div>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{i.color_primary} | {i.material}</span>
              <div style={cpwTagStyle}>{i.purchase_price} ₽</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFavorites = () => {
    if (!token) return renderLoginPrompt("Избранное", "🤍");
    return (
      <div style={contentStyle}>
        <h2>Избранные луки</h2>
        {favorites.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '50px' }}><span style={{ fontSize: '40px' }}>🤍</span><p>Вы пока не сохранили ни одного образа.</p></div>
        ) : (<div style={gridStyle}></div>)}
      </div>
    );
  };

  const renderProfile = () => {
    const styleOptions = [
      { id: "old_money", name: "Old Money / Классика", img: "https://images.unsplash.com/photo-1600091166971-7f9faad6c1e2?w=400&q=80" },
      { id: "streetwear", name: "Уличный стиль", img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&q=80" },
      { id: "smart_casual", name: "Smart Casual", img: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&q=80" },
      { id: "minimalism", name: "Минимализм", img: "https://images.unsplash.com/photo-1434389678869-be40b3e92ed5?w=400&q=80" }
    ];

    return (
      <div style={contentStyle}>
        <h2>Профиль</h2>

        {token ? (
          <>
            {/* БЛОК: АНАЛИЗ ВНЕШНОСТИ (STYLE ID) */}
            <div style={{...cardStyle, border: '1px solid #00e6b8'}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{ fontSize: '35px' }}>🧍‍♀️</div>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>Мой Style ID</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Узнай свой цветотип и тип фигуры</p>
                </div>
              </div>

              <input type="file" accept="image/*" ref={personPhotoRef} onChange={handlePersonPhotoSelect} style={{ display: 'none' }} />

              {/* 1. ЕСЛИ НЕТ ФОТО И НЕТ СОХРАНЕННОГО РЕЗУЛЬТАТА В БАЗЕ */}
              {!personPhoto && !user?.style_analysis && (
                <>
                  <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '15px', lineHeight: '1.5' }}>
                    Загрузите фото во весь рост (желательно при дневном свете и в облегающей одежде), чтобы ИИ-стилист определил ваши идеальные цвета и фасоны.
                  </p>
                  <button onClick={() => personPhotoRef.current.click()} style={{...buttonStyle(false), width: '100%'}}>
                    📸 Загрузить фото фигуры
                  </button>
                </>
              )}

              {/* 2. ЕСЛИ У ЮЗЕРА УЖЕ ЕСТЬ РЕЗУЛЬТАТ В БАЗЕ (Показываем сразу!) */}
              {!personPhoto && user?.style_analysis && (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                  {user?.vton_image && (
                    <img src={user.vton_image} alt="Моя фигура" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px', maxHeight: '400px', objectFit: 'cover' }} />
                  )}
                  <div style={{ fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                    {user.style_analysis}
                  </div>
                  <button onClick={() => personPhotoRef.current.click()} style={{...buttonStyle(false), width: '100%', marginTop: '15px', background: '#333', color: '#fff'}}>
                    🔄 Обновить фото и Style ID
                  </button>
                </div>
              )}

              {/* 3. ЕСЛИ ЗАГРУЗИЛИ НОВОЕ ФОТО (ПРЕВЬЮ И КНОПКА ОТПРАВКИ) */}
              {personPhoto && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={personPhoto} alt="Превью" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px', maxHeight: '400px', objectFit: 'cover' }} />

                  {/* Кнопки до отправки */}
                  {!isAnalyzingPerson && !personAnalysis && (
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button onClick={() => { setPersonPhoto(null); setPersonImageBase64(null); }} style={{...buttonStyle(false), flex: 1, background: '#333', color: '#fff'}}>Отмена</button>
                      <button onClick={handleAnalyzePerson} style={{...buttonStyle(false), flex: 2}}>✨ Отправить ИИ</button>
                    </div>
                  )}

                  {/* Лоадер */}
                  {isAnalyzingPerson && <span style={{ color: '#00e6b8', fontWeight: 'bold', margin: '15px 0', textAlign: 'center' }}>ИИ снимает мерки и подбирает палитру... ⏳</span>}

                  {/* Результат после генерации (показываем его до перезагрузки страницы) */}
                  {personAnalysis && !isAnalyzingPerson && (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                        {personAnalysis}
                      </div>
                      <button onClick={() => { setPersonPhoto(null); setPersonAnalysis(""); setPersonImageBase64(null); }} style={{...buttonStyle(false), width: '100%', marginTop: '15px', background: '#333', color: '#fff'}}>
                        Закрыть превью
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleLogout} style={{...logoutButtonStyle, marginTop: '20px'}}>Выйти из аккаунта</button>
          </>
        ) : (
          <div>
            <p>Войдите, чтобы создать свой профиль стиля.</p>
          </div>
        )}
      </div>
    );

  };

  return (
    <div style={appWrapperStyle}>
      <div style={scrollableAreaStyle}>
        {activeTab === "home" && renderHome()}
        {activeTab === "wardrobe" && renderWardrobe()}
        {activeTab === "favorites" && renderFavorites()}
        {activeTab === "profile" && renderProfile()}
      </div>
      <div style={bottomNavStyle}>
        <div style={navItemStyle(activeTab === "home")} onClick={() => setActiveTab("home")}><span>🏠</span><br/>Главная</div>
        <div style={navItemStyle(activeTab === "favorites")} onClick={() => setActiveTab("favorites")}><span>🤍</span><br/>Избранные</div>
        <div style={navItemStyle(activeTab === "wardrobe")} onClick={() => setActiveTab("wardrobe")}><span>👕</span><br/>Гардероб</div>
        <div style={navItemStyle(activeTab === "profile")} onClick={() => setActiveTab("profile")}><span>👤</span><br/>Профиль</div>
      </div>
    </div>
  );
}

// --- СТИЛИ ---
const containerStyle = { minHeight: "100vh", backgroundColor: "#0b0c10", color: "#fff", fontFamily: "system-ui, sans-serif" };
const appWrapperStyle = { height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0b0c10", color: "#fff", fontFamily: "system-ui, sans-serif" };
const scrollableAreaStyle = { flex: 1, overflowY: "auto", paddingBottom: "80px" }; 
const contentStyle = { padding: "20px", maxWidth: "500px", margin: "0 auto" };
const cardStyle = { background: "#151822", padding: "20px", borderRadius: "16px", marginBottom: "20px", border: "1px solid #222" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#1c1f26", color: "#fff", marginBottom: "10px", outline: "none", boxSizing: "border-box", appearance: "none" };
const formStyle = { display: 'flex', flexDirection: 'column' };
const buttonStyle = (loading) => ({ padding: "14px", borderRadius: "8px", border: "none", background: loading ? "#444" : "#00e6b8", color: "#000", fontWeight: "bold", cursor: "pointer", transition: "0.3s" });
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
const itemCardStyle = { background: "#151822", padding: "15px", borderRadius: "12px", border: "1px solid #222", display: 'flex', flexDirection: 'column', gap: '4px' };
const cpwTagStyle = { marginTop: '8px', color: '#00e6b8', fontSize: '12px', fontWeight: 'bold' };
const tierBadgeStyle = { background: 'rgba(0, 230, 184, 0.1)', color: '#00e6b8', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' };
const logoutButtonStyle = { background: "none", color: "#ff4d4d", border: "1px solid #ff4d4d", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", width: "100%" };
const bottomNavStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#151822', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px 0', zIndex: 1000 };
const navItemStyle = (isActive) => ({ textAlign: 'center', fontSize: '10px', color: isActive ? '#00e6b8' : '#888', cursor: 'pointer', opacity: isActive ? 1 : 0.6, transition: '0.2s' });
const aiBannerStyle = { background: 'linear-gradient(135deg, #00e6b8 0%, #00b38f 100%)', padding: '20px', borderRadius: '16px', color: '#0b0c10', boxShadow: '0 10px 20px rgba(0, 230, 184, 0.2)' };
const occasionCardStyle = { background: '#151822', padding: '15px', borderRadius: '16px', border: '1px solid #222', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '5px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' };
const iconCircleStyle = { background: '#1c1f26', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', marginBottom: '5px', border: '1px solid #333' };
const storiesContainerStyle = { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none' };
const storyCircleWrapperStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '70px', cursor: 'pointer' };
const storyCircleStyle = { width: '64px', height: '64px', borderRadius: '50%', background: '#151822', border: '2px solid #00e6b8', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', padding: '2px' };
const storyTitleStyle = { fontSize: '10px', textAlign: 'center', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' };
const storyModalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const storyModalStyle = { background: '#151822', padding: '30px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid #00e6b8' };
const iconBtnStyle = { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', padding: '2px' };

export default App;