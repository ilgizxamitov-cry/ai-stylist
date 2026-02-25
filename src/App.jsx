import React, { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://ai-stylist-production-7f72.up.railway.app";

function App() {
  // --- СОСТОЯНИЯ БАЗОВЫЕ ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [wardrobe, setWardrobe] = useState([]);
  const [activeTab, setActiveTab] = useState("wardrobe"); 
  const [loading, setLoading] = useState(false);

  // --- СОСТОЯНИЯ ДЛЯ ИИ И ИЗБРАННОГО ---
  const fileInputRef = useRef(null);
  const [uploadedLook, setUploadedLook] = useState(null);
  const [aiVerdict, setAiVerdict] = useState("");
  const [favorites, setFavorites] = useState([]); 

  // --- СОСТОЯНИЕ ФОРМЫ ДОБАВЛЕНИЯ ---
  const [item, setItem] = useState({
    category: "Top", subcategory: "", color_primary: "", material: "", style: "Casual", price: "", seasons: "", occasions: ""
  });

  // --- ЭФФЕКТЫ ---
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchWardrobe();
    }
  }, [token]);

  useEffect(() => {
    if (token) return;
    const initGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (window.google?.accounts?.id && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        });
        const btn = document.getElementById("googleSignInDiv");
        if (btn) window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large" });
      }
    };
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [token]);

  // --- ЛОГИКА АВТОРИЗАЦИИ И БД ---
  const handleGoogleLogin = async (response) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err) { console.error("Login error:", err); }
  };

  const fetchWardrobe = async () => {
    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!item.category || !user) return;
    setLoading(true);

    const formattedSeasons = item.seasons ? item.seasons.split(",").map(s => s.trim()).filter(Boolean) : [];
    const formattedOccasions = item.occasions ? item.occasions.split(",").map(o => o.trim()).filter(Boolean) : [];

    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...item,
          purchase_price: parseFloat(item.price) || 0,
          seasons: formattedSeasons,
          occasions: formattedOccasions
        }),
      });

      const data = await res.json();

      if (res.status === 403) {
        alert(`⛔ Лимит: ${data.error}`);
        return;
      }

      if (res.ok) {
        setItem({ category: "Top", subcategory: "", color_primary: "", material: "", style: "Casual", price: "", seasons: "", occasions: "" });
        fetchWardrobe();
      } else {
        alert(`Ошибка сервера: ${data.error || 'Проверьте логи'}`);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setWardrobe([]);
  };

  // --- ЛОГИКА ИМИТАЦИИ ИИ (Wizard of Oz) ---
  const handleUploadLook = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedLook(URL.createObjectURL(file));
    setAiVerdict("⏳ ИИ анализирует текстуры и цвета...");

    setTimeout(() => {
      setAiVerdict("Я уверен, вы выглядите великолепно! 🔥\n(Функция ИИ-оценки скоро будет доступна)");
    }, 2000);
  };

  // --- ЭКРАНЫ (РЕНДЕР) ---
  
  // Экран 1: Главная (Интерактивный дашборд)
  const renderHome = () => (
    <div style={contentStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Привет, {user?.name?.split(' ')[0] || 'Стиляга'}! 👋</h2>
          <p style={{ margin: 0, opacity: 0.6, fontSize: '14px' }}>Готов сиять сегодня?</p>
        </div>
        {user?.picture && <img src={user.picture} alt="Avatar" style={{ width: '40px', borderRadius: '50%', border: '2px solid #00e6b8' }} />}
      </div>

      {/* Главная функция: Оценить образ */}
      <div style={aiBannerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '40px' }}>✨</div>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>Оценить образ</h3>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Загрузи фото для разбора</p>
          </div>
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadLook} style={{ display: 'none' }} />
        
        <button onClick={() => fileInputRef.current.click()} style={{ ...buttonStyle(false), width: '100%', marginTop: '15px', background: '#fff' }}>
          📸 Камера / Галерея
        </button>

        {uploadedLook && (
          <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
            <img src={uploadedLook} alt="Мой лук" style={{ width: '100%', borderRadius: '8px', marginBottom: '10px', maxHeight: '300px', objectFit: 'cover' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0b0c10', whiteSpace: 'pre-line' }}>{aiVerdict}</p>
          </div>
        )}
      </div>

      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Подобрать образ для:</h3>
      <div style={gridStyle}>
        <div style={occasionCardStyle} onClick={() => alert("ИИ подбирает деловой образ...")}><div style={iconCircleStyle}>💼</div><span style={{ fontWeight: 'bold' }}>Работа</span></div>
        <div style={occasionCardStyle} onClick={() => alert("ИИ подбирает образ для вечеринки...")}><div style={iconCircleStyle}>🪩</div><span style={{ fontWeight: 'bold' }}>Вечеринка</span></div>
        <div style={occasionCardStyle} onClick={() => alert("ИИ подбирает casual образ...")}><div style={iconCircleStyle}>👟</div><span style={{ fontWeight: 'bold' }}>Прогулка</span></div>
        <div style={occasionCardStyle} onClick={() => alert("ИИ подбирает вечерний образ...")}><div style={iconCircleStyle}>🥂</div><span style={{ fontWeight: 'bold' }}>Мероприятие</span></div>
      </div>
    </div>
  );

  // Экран 2: Гардероб (Форма + Список)
  const renderWardrobe = () => (
    <div style={contentStyle}>
      <h2>Гардероб</h2>
      <div style={cardStyle}>
        <h3 style={{ marginBottom: "15px" }}>Добавить вещь</h3>
        <form onSubmit={handleAddItem} style={formStyle}>
          <div style={{ marginBottom: '15px', borderLeft: '3px solid #ff4d4d', paddingLeft: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#ff4d4d' }}>Обязательно</p>
            <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} style={inputStyle} required>
              <option value="Top">Верх</option><option value="Bottom">Низ</option><option value="Shoes">Обувь</option><option value="Outwear">Верхняя одежда</option>
            </select>
            <input placeholder="Подкатегория (Худи, Джинсы) *" value={item.subcategory} onChange={e => setItem({...item, subcategory: e.target.value})} style={inputStyle} required />
            <input placeholder="Основной цвет *" value={item.color_primary} onChange={e => setItem({...item, color_primary: e.target.value})} style={inputStyle} required />
            <input placeholder="Цена покупки *" type="number" value={item.price} onChange={e => setItem({...item, price: e.target.value})} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '15px', borderLeft: '3px solid #00e6b8', paddingLeft: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#00e6b8' }}>Дополнительно для ИИ</p>
            <input placeholder="Материал (Хлопок, Шерсть)" value={item.material} onChange={e => setItem({...item, material: e.target.value})} style={inputStyle} />
            <input placeholder="Сезоны (Зима, Лето)" value={item.seasons} onChange={e => setItem({...item, seasons: e.target.value})} style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={buttonStyle(loading)}>{loading ? "Сохранение..." : "Добавить в шкаф"}</button>
        </form>
      </div>

      <div style={gridStyle}>
        {wardrobe.map(i => (
          <div key={i.id} style={itemCardStyle}>
            <span style={{ fontWeight: "bold" }}>{i.subcategory || i.category}</span>
            <span style={{ fontSize: "12px", opacity: 0.7 }}>{i.color_primary} {i.material ? `| ${i.material}` : ''}</span>
            <div style={cpwTagStyle}>{i.purchase_price} ₽</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Экран 3: Избранные
  const renderFavorites = () => (
    <div style={contentStyle}>
      <h2>Избранные луки</h2>
      {favorites.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '50px' }}>
          <span style={{ fontSize: '40px' }}>🤍</span>
          <p>Вы пока не сохранили ни одного образа.</p>
          <p style={{ fontSize: '12px' }}>Сгенерируйте лук на главной странице и нажмите на сердечко, чтобы он появился здесь.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {/* Будущие карточки */}
        </div>
      )}
    </div>
  );

  // Экран 4: Профиль
  const renderProfile = () => (
    <div style={contentStyle}>
      <h2>Профиль</h2>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        {user?.picture && <img src={user.picture} alt="Avatar" style={{ width: '80px', borderRadius: '50%', marginBottom: '10px' }} />}
        <h3>{user?.name}</h3>
        <p style={{ opacity: 0.7 }}>{user?.email}</p>
        <span style={tierBadgeStyle}>{user?.subscription_tier || 'FREE'} PLAN</span>
        <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
          <button onClick={handleLogout} style={logoutButtonStyle}>Выйти из аккаунта</button>
        </div>
      </div>
    </div>
  );

  // --- ТОЧКА ВХОДА (Если не авторизован) ---
  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', color: '#00e6b8' }}>AI Stylist Pro</h1>
          <p style={{ opacity: 0.8 }}>Ваш умный гардероб на базе ИИ.</p>
          <div id="googleSignInDiv" style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}></div>
        </div>
      </div>
    );
  }

  // --- ОСНОВНОЙ ИНТЕРФЕЙС (Если авторизован) ---
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

const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#1c1f26", color: "#fff", marginBottom: "10px", outline: "none", boxSizing: "border-box" };
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

export default App;