import { useState, useEffect, useRef, useMemo } from "react";
import { removeBackground } from "@imgly/background-removal";

import TopBar from "./components/layout/TopBar.jsx";
import TabBar from "./components/layout/TabBar.jsx";
import HomeScreen from "./components/screens/HomeScreen.jsx";
import WardrobeScreen from "./components/screens/WardrobeScreen.jsx";
import FavoritesScreen from "./components/screens/FavoritesScreen.jsx";
import ProfileScreen from "./components/screens/ProfileScreen.jsx";
import LoginPrompt from "./components/screens/LoginPrompt.jsx";
import { initialItemState } from "./lib/constants.js";
import {
  IconSparkle,
  IconHanger,
  IconTag,
  IconCamera,
} from "./components/ui/Icons.jsx";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-stylist-production-7f72.up.railway.app";

const ONBOARDING_STORIES = [
  {
    id: 1,
    Icon: IconSparkle,
    title: "ИИ-Стилист",
    text: "Загрузите фото, и нейросеть разберёт ваш образ на детали, оценив стиль и цветовое сочетание.",
  },
  {
    id: 2,
    Icon: IconHanger,
    title: "Умный шкаф",
    text: "Оцифруйте свою одежду один раз. Забудьте о проблеме «нечего надеть» навсегда.",
  },
  {
    id: 3,
    Icon: IconTag,
    title: "Метрика CPW",
    text: "Мы считаем стоимость каждого выхода вещи (Cost Per Wear). Экономьте на покупках с умом.",
  },
  {
    id: 4,
    Icon: IconCamera,
    title: "Примерочная",
    text: "Примеряйте вещи из гардероба на своё фото — ИИ покажет, как это сидит.",
  },
];

const TAB_TITLES = {
  home: "Стилист",
  favorites: "Избранное",
  wardrobe: "Гардероб",
  profile: "Профиль",
};

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
  const [generatedOutfit, setGeneratedOutfit] = useState(null);

  const [preferences, setPreferences] = useState([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Форма вещи (CRUD)
  const [item, setItem] = useState(initialItemState);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const itemPhotoInputRef = useRef(null);
  const [isScanningItem, setIsScanningItem] = useState(false);

  const [isListening, setIsListening] = useState(false);
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
    if (activeTab !== "profile") return;

    const initGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (window.google?.accounts?.id && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        });
        const btn = document.getElementById("googleSignInDiv");
        if (btn) {
          window.google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
            shape: "pill",
          });
        }
      }
    };

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && document.getElementById("googleSignInDiv")) {
        initGoogle();
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [token, activeTab]);

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
        if (data.user.style_preferences) setPreferences(data.user.style_preferences);
        setActiveTab("wardrobe");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const fetchWardrobe = async () => {
    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // --- Добавление голосом ---
  const handleVoiceAdd = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает голосовой ввод. Попробуйте Chrome или Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Speech error", event);
      setIsListening(false);
      if (event.error !== "aborted") {
        alert("Ошибка микрофона. Убедитесь, что вы разрешили доступ.");
      }
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsScanningItem(true);

      try {
        const res = await fetch(`${API_URL}/api/parse-voice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: transcript }),
        });

        const data = await res.json();

        if (res.ok && data.items && data.items.length > 0) {
          const itemNames = data.items
            .map((i) => `${i.color_primary} ${i.subcategory}`)
            .join(", ");

          if (
            window.confirm(
              `Вы сказали: "${transcript}"\n\nИИ распознал:\n${itemNames}.\n\nДобавить в гардероб?`
            )
          ) {
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
                image_url: null,
              };
              await fetch(`${API_URL}/wardrobe`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });
            }
            fetchWardrobe();
            setIsFormOpen(false);
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

  // --- Распознавание вещи по фото ---
  const handleItemPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanningItem(true);

    try {
      const transparentBlob = await removeBackground(file);

      const reader = new FileReader();
      reader.readAsDataURL(transparentBlob);
      reader.onloadend = async () => {
        try {
          const res = await fetch(`${API_URL}/api/auto-tag-item`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imageBase64: reader.result }),
          });

          const data = await res.json();

          if (res.ok) {
            setItem((prev) => ({
              ...prev,
              category: data.item.category || prev.category,
              subcategory: data.item.subcategory || prev.subcategory,
              color_primary: data.item.color_primary || prev.color_primary,
              material: data.item.material || prev.material,
              seasons: data.item.seasons || prev.seasons,
              image_url: data.imageUrl,
            }));
          } else {
            alert(`Ошибка сервера: ${data.error}`);
          }
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

  // --- CRUD: создание и обновление ---
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!item.category || !user) return;
    setLoading(true);

    const formattedSeasons = item.seasons
      ? item.seasons.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const formattedOccasions = item.occasions
      ? item.occasions.split(",").map((o) => o.trim()).filter(Boolean)
      : [];

    const payload = {
      ...item,
      purchase_price: parseFloat(item.price) || 0,
      seasons: formattedSeasons,
      occasions: formattedOccasions,
    };
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId
      ? `${API_URL}/wardrobe/${editingId}`
      : `${API_URL}/wardrobe`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 403) {
        alert(`Лимит: ${data.error}`);
        return;
      }
      if (res.ok) {
        setItem(initialItemState);
        setEditingId(null);
        setIsFormOpen(false);
        fetchWardrobe();
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Точно удалить эту вещь из гардероба?")) return;
    try {
      const res = await fetch(`${API_URL}/wardrobe/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchWardrobe();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (itemToEdit) => {
    setItem({
      category: itemToEdit.category,
      subcategory: itemToEdit.subcategory || "",
      color_primary: itemToEdit.color_primary || "Черный",
      material: itemToEdit.material || "Хлопок",
      style: itemToEdit.style || "Casual",
      price: itemToEdit.purchase_price || "",
      seasons:
        itemToEdit.seasons && itemToEdit.seasons.length > 0
          ? itemToEdit.seasons.join(", ")
          : "Мультисезон",
      occasions: itemToEdit.occasions ? itemToEdit.occasions.join(", ") : "",
      image_url: itemToEdit.image_url || null,
    });
    setEditingId(itemToEdit.id);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    setItem(initialItemState);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setItem(initialItemState);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setWardrobe([]);
    setPreferences([]);
    setActiveTab("home");
  };

  const toggleStyle = (styleId) => {
    setPreferences((prev) =>
      prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]
    );
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch(`${API_URL}/api/user/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch (err) {
      alert("Ошибка при сохранении.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiVerdict("");
    setIsAnalyzing(false);
    setUploadedLook(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setImageBase64(reader.result);
  };

  const sendForAnalysis = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setAiVerdict("");
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });
      const data = await res.json();
      if (res.ok) setAiVerdict(data.verdict);
      else setAiVerdict(`Ошибка ИИ: ${data.error}`);
    } catch (err) {
      setAiVerdict("Ошибка соединения с сервером.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetLook = () => {
    setUploadedLook(null);
    setAiVerdict("");
    setImageBase64(null);
  };

  const handleGenerateOutfit = async (selectedOccasion) => {
    setIsGenerating(true);
    setGeneratedOutfit(null);
    setTryOnResult(null);

    try {
      const res = await fetch(`${API_URL}/api/generate-outfit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          occasion: selectedOccasion,
          wardrobe,
          preferences: user?.style_preferences || [],
        }),
      });
      const data = await res.json();

      if (res.ok) setGeneratedOutfit(data);
      else alert("Ошибка сервера: " + data.error);
    } catch (error) {
      alert("Ошибка связи со стилистом.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryOn = async (itemId) => {
    const garment = wardrobe.find((i) => i.id === itemId);
    if (!garment || !garment.image_url) {
      alert("У этой вещи нет фотографии (или фон не был удалён)!");
      return;
    }

    setIsTryingOn(true);
    try {
      const res = await fetch(`${API_URL}/api/try-on`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ garmentUrl: garment.image_url }),
      });

      const data = await res.json();

      if (res.ok) setTryOnResult(data.resultUrl);
      else
        alert(
          data.error || "Ошибка примерки. Возможно, вы не загрузили своё фото в Профиле."
        );
    } catch (error) {
      alert("Сервер сейчас перегружен. Попробуйте ещё раз через минуту.");
    } finally {
      setIsTryingOn(false);
    }
  };

  const handlePersonPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPersonPhoto(URL.createObjectURL(file));
    setPersonAnalysis("");
    setPersonImageBase64(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setPersonImageBase64(reader.result);
  };

  const handleResetPersonPhoto = () => {
    setPersonPhoto(null);
    setPersonAnalysis("");
    setPersonImageBase64(null);
  };

  const handleAnalyzePerson = async () => {
    if (!personImageBase64) return;
    setIsAnalyzingPerson(true);

    try {
      const res = await fetch(`${API_URL}/api/analyze-person`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: personImageBase64 }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setPersonAnalysis(data.user.style_analysis);
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

  const tryOnItem = useMemo(() => {
    const id = generatedOutfit?.top_item_id;
    if (!id) return null;
    const found = wardrobe.find((i) => i.id === id);
    return found?.image_url ? found : null;
  }, [generatedOutfit, wardrobe]);

  const topBarRight =
    activeTab === "home" && user?.picture ? (
      <span className="avatar avatar-ring">
        <img
          src={user.picture || "/placeholder.svg"}
          alt=""
          className="avatar"
          style={{ width: "100%", height: "100%" }}
        />
      </span>
    ) : null;

  const homeGreeting = token
    ? `Привет, ${user?.name?.split(" ")[0] || "друг"}`
    : TAB_TITLES.home;

  return (
    <div className="app">
      <TopBar
        title={activeTab === "home" ? homeGreeting : TAB_TITLES[activeTab]}
        right={topBarRight}
      />

      <main className="app-scroll">
        {activeTab === "home" && (
          <HomeScreen
            stories={ONBOARDING_STORIES}
            activeStory={activeStory}
            onOpenStory={setActiveStory}
            onCloseStory={() => setActiveStory(null)}
            fileInputRef={fileInputRef}
            uploadedLook={uploadedLook}
            onFileSelect={handleFileSelect}
            onPickPhoto={() => fileInputRef.current?.click()}
            onSendForAnalysis={sendForAnalysis}
            onResetLook={handleResetLook}
            isAnalyzing={isAnalyzing}
            aiVerdict={aiVerdict}
            onGenerate={handleGenerateOutfit}
            isGenerating={isGenerating}
            generatedOutfit={generatedOutfit}
            tryOnItem={tryOnItem}
            onTryOn={handleTryOn}
            isTryingOn={isTryingOn}
            tryOnResult={tryOnResult}
          />
        )}

        {activeTab === "favorites" && (
          <FavoritesScreen
            token={token}
            favorites={favorites}
            onGoToLogin={() => setActiveTab("profile")}
            onGoHome={() => setActiveTab("home")}
          />
        )}

        {activeTab === "wardrobe" &&
          (token ? (
            <WardrobeScreen
              wardrobe={wardrobe}
              isFormOpen={isFormOpen}
              onOpenForm={handleOpenForm}
              onCloseForm={handleCloseForm}
              onEditItem={handleEditClick}
              onDeleteItem={handleDeleteItem}
              formProps={{
                item,
                onChange: setItem,
                onSubmit: handleAddItem,
                onCancel: handleCloseForm,
                isEditing: Boolean(editingId),
                loading,
                photoInputRef: itemPhotoInputRef,
                onPhotoSelect: handleItemPhotoSelect,
                isScanning: isScanningItem,
                isListening,
                onVoiceAdd: handleVoiceAdd,
              }}
            />
          ) : (
            <LoginPrompt
              icon={<IconHanger size={30} />}
              title="Нужен профиль"
              description="Войдите, чтобы оцифровать гардероб и получать образы из своих вещей."
              onGoToLogin={() => setActiveTab("profile")}
            />
          ))}

        {activeTab === "profile" && (
          <ProfileScreen
            token={token}
            user={user}
            wardrobeCount={wardrobe.length}
            preferences={preferences}
            onToggleStyle={toggleStyle}
            onSavePreferences={handleSavePreferences}
            isSavingPrefs={isSavingPrefs}
            personPhotoRef={personPhotoRef}
            personPhoto={personPhoto}
            onPersonPhotoSelect={handlePersonPhotoSelect}
            onAnalyzePerson={handleAnalyzePerson}
            onResetPersonPhoto={handleResetPersonPhoto}
            isAnalyzingPerson={isAnalyzingPerson}
            personAnalysis={personAnalysis}
            onLogout={handleLogout}
          />
        )}
      </main>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;
