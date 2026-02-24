import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://ai-stylist-production-7f72.up.railway.app";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [wardrobe, setWardrobe] = useState([]);
  
  const [item, setItem] = useState({
    category: "Top",
    subcategory: "",
    color_primary: "",
    material: "",
    style: "Casual",
    price: "",
    seasons: "",
    occasions: ""
  });

  const [loading, setLoading] = useState(false);

  // --- ЭФФЕКТ 1: Загрузка сессии ---
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchWardrobe();
    }
  }, [token]);

  // --- ЭФФЕКТ 2: ИНИЦИАЛИЗАЦИЯ КНОПКИ GOOGLE (ЭТОГО НЕ ХВАТАЛО) ---
  useEffect(() => {
    if (token) return; // Если уже вошли, кнопка не нужна

    const initGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (window.google?.accounts?.id && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        });
        const btn = document.getElementById("googleSignInDiv");
        if (btn) {
          window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large" });
        }
      }
    };

    // Проверяем наличие скрипта каждые 500мс
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [token]);

  // Остальные функции (fetchWardrobe, handleGoogleLogin, handleAddItem) остаются без изменений...
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
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...item,
          purchase_price: parseFloat(item.price) || 0,
          seasons: item.seasons.split(",").map(s => s.trim()).filter(s => s !== ""),
        }),
      });
      if (res.ok) {
        setItem({ category: "Top", subcategory: "", color_primary: "", material: "", style: "Casual", price: "", seasons: "", occasions: "" });
        fetchWardrobe();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  // Отрисовка
  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: "center" }}>AI Stylist Pro</h1>
          <div id="googleSignInDiv" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
       <div style={profileHeaderStyle}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} style={logoutButtonStyle}>Выйти</button>
       </div>
       {/* Форма и Список как в твоем коде... */}
       <div style={cardStyle}>
         <h3>Добавить вещь</h3>
         <form onSubmit={handleAddItem} style={formStyle}>
            <input placeholder="Подкатегория" value={item.subcategory} onChange={e => setItem({...item, subcategory: e.target.value})} style={inputStyle} />
            <input placeholder="Цена" value={item.price} onChange={e => setItem({...item, price: e.target.value})} style={inputStyle} />
            <button type="submit" style={buttonStyle(loading)}>Добавить</button>
         </form>
       </div>
    </div>
  );
}

// Стили остаются такими же...
const containerStyle = { minHeight: "100vh", padding: "20px", backgroundColor: "#0b0c10", color: "#fff" };
const cardStyle = { background: "#151822", padding: "20px", borderRadius: "16px", maxWidth: "500px", margin: "20px auto" };
const profileHeaderStyle = { display: 'flex', justifyContent: 'space-between', maxWidth: "500px", margin: "0 auto" };
const logoutButtonStyle = { color: "#ff4d4d", background: "none", border: "none", cursor: "pointer" };
const inputStyle = { padding: "10px", marginBottom: "10px", background: "#1c1f26", color: "#fff", border: "1px solid #333" };
const formStyle = { display: 'flex', flexDirection: 'column' };
const buttonStyle = (l) => ({ background: l ? "#444" : "#00e6b8", padding: "10px", border: "none" });

export default App;