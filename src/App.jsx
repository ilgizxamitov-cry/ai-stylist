import React, { useState, useEffect } from "react";

// Используем переменные окружения для гибкости и безопасности
const API_URL = import.meta.env.VITE_API_URL || "https://ai-stylist-production-7f72.up.railway.app";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  // --- Состояния ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [wardrobe, setWardrobe] = useState([]);
  
  // Состояние формы (единый объект для удобства расширения)
  const [item, setItem] = useState({
    category: "",
    color: "",
    season: "",
    occasion: "",
    price: ""
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // --- Эффекты ---

  // 1. Проверка сессии при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchWardrobe(parsedUser.id);
    }
  }, [token]);

  // 2. Инициализация кнопки Google (с интервалом для надежности на Vercel)
  useEffect(() => {
    const initGoogleAuth = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", width: 250 }
        );
      }
    };

    const interval = setInterval(() => {
      if (window.google) {
        initGoogleAuth();
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [user]);

  // --- Функции-обработчики ---

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
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setWardrobe([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem(prev => ({ ...prev, [name]: value }));
  };

  const fetchWardrobe = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/wardrobe/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch wardrobe error:", err);
    }
  };

  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    if (!item.category || !user) return;

    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          user_id: user.id,
          category: item.category,
          color: item.color,
          season: item.season,
          occasion: item.occasion,
          purchase_price: parseFloat(item.price) || 0
        }),
      });

      if (res.ok) {
        setItem({ category: "", color: "", season: "", occasion: "", price: "" });
        fetchWardrobe(user.id);
      }
    } catch (err) {
      console.error("Add item error:", err);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || loading) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Analyze error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Рендеринг интерфейса ---

  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: "center" }}>AI Stylist</h1>
          <p style={{ textAlign: "center", opacity: 0.7 }}>Ваш персональный ИИ-ассистент</p>
          <div id="googleSignInDiv" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Шапка профиля */}
      <div style={profileHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user?.picture && <img src={user.picture} alt="Avatar" style={avatarStyle} />}
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>Выйти</button>
      </div>

      {/* Блок анализа образа */}
      <div style={cardStyle}>
        <h3>Анализ образа</h3>
        <input type="file" accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
        {selectedImage && <img src={URL.createObjectURL(selectedImage)} alt="Preview" style={previewStyle} />}
        <button 
          onClick={handleAnalyze} 
          disabled={!selectedImage || loading} 
          style={buttonStyle(!selectedImage || loading)}
        >
          {loading ? "Анализируем..." : "Анализировать"}
        </button>
        {result && (
          <div style={resultBoxStyle}>
            <p><strong>Вердикт:</strong> {result.verdict}</p>
          </div>
        )}
      </div>

      {/* Форма добавления в гардероб */}
      <div style={cardStyle}>
        <h3>Добавить вещь</h3>
        <form onSubmit={handleAddItem} style={formStyle}>
          <input name="category" placeholder="Категория" value={item.category} onChange={handleChange} style={inputStyle} required />
          <input name="color" placeholder="Цвет" value={item.color} onChange={handleChange} style={inputStyle} />
          <input name="price" type="number" placeholder="Цена покупки" value={item.price} onChange={handleChange} style={inputStyle} />
          <button type="submit" style={buttonStyle(false)}>Сохранить в базу</button>
        </form>
      </div>

      {/* Список вещей */}
      <div style={cardStyle}>
        <h3>Мой шкаф ({wardrobe.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {wardrobe.map(i => (
            <li key={i.id} style={listItemStyle}>
              <span>{i.category} ({i.color})</span>
              <span style={{ color: '#00e6b8' }}>{i.purchase_price} ₽</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- Стили ---
const containerStyle = { minHeight: "100vh", padding: "20px", backgroundColor: "#0b0c10", color: "#fff", fontFamily: "system-ui, sans-serif" };
const cardStyle = { background: "#151822", padding: "20px", borderRadius: "12px", marginBottom: "20px", maxWidth: "500px", margin: "0 auto 20px" };
const profileHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: "500px", margin: "0 auto 20px", background: "#151822", padding: "10px 20px", borderRadius: "12px" };
const avatarStyle = { width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #00e6b8' };
const logoutButtonStyle = { background: "#ff4d4d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" };
const inputStyle = { padding: "10px", borderRadius: "6px", border: "1px solid #333", background: "#0b0c10", color: "#fff" };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const buttonStyle = (disabled) => ({ padding: "12px", borderRadius: "6px", border: "none", background: disabled ? "#444" : "#00e6b8", color: "#000", fontWeight: "bold", cursor: disabled ? "not-allowed" : "pointer", marginTop: "10px" });
const previewStyle = { width: "100%", borderRadius: "8px", marginTop: "10px" };
const resultBoxStyle = { marginTop: "15px", padding: "10px", borderTop: "1px solid #333" };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #222' };

export default App;