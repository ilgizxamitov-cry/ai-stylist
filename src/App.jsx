import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://ai-stylist-production-7f72.up.railway.app";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [wardrobe, setWardrobe] = useState([]);
  
  // Расширенное состояние для сбора "умных" данных
  const [item, setItem] = useState({
    category: "Top",
    subcategory: "",
    color_primary: "",
    material: "",
    style: "Casual",
    price: "",
    seasons: "", // Будем вводить через запятую и превращать в массив
    occasions: ""
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchWardrobe();
    }
  }, [token]);

  const fetchWardrobe = async () => {
    try {
      const res = await fetch(`${API_URL}/wardrobe`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!item.category || !user) return;
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
          // Превращаем строки в массивы для БД
          seasons: item.seasons.split(",").map(s => s.trim()).filter(s => s !== ""),
          occasions: item.occasions.split(",").map(o => o.trim()).filter(o => o !== "")
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
      }
    } catch (err) {
      console.error("Add item error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setWardrobe([]);
  };

  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: "center", marginBottom: "10px" }}>AI Stylist Pro</h1>
          <p style={{ textAlign: "center", opacity: 0.7, marginBottom: "30px" }}>Управление гардеробом нового поколения</p>
          <div id="googleSignInDiv" style={{ display: 'flex', justifyContent: 'center' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Профессиональная шапка */}
      <div style={profileHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user?.picture && <img src={user.picture} alt="Avatar" style={avatarStyle} />}
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{user?.name}</p>
            <p style={tierBadgeStyle}>{user?.subscription_tier || 'free'} plan</p>
          </div>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>Выйти</button>
      </div>

      {/* Форма добавления: Инженерный подход */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: "15px" }}>Оцифровать вещь</h3>
        <form onSubmit={handleAddItem} style={formStyle}>
          <select 
            value={item.category} 
            onChange={e => setItem({...item, category: e.target.value})} 
            style={inputStyle}
          >
            <option value="Top">Верх (Топ/Худи)</option>
            <option value="Bottom">Низ (Брюки/Джинсы)</option>
            <option value="Shoes">Обувь</option>
            <option value="Outwear">Верхняя одежда</option>
          </select>
          
          <input placeholder="Подкатегория (напр. Свитшот)" value={item.subcategory} onChange={e => setItem({...item, subcategory: e.target.value})} style={inputStyle} />
          <input placeholder="Материал (напр. Хлопок 100%)" value={item.material} onChange={e => setItem({...item, material: e.target.value})} style={inputStyle} />
          <input placeholder="Основной цвет" value={item.color_primary} onChange={e => setItem({...item, color_primary: e.target.value})} style={inputStyle} />
          <input placeholder="Цена покупки" type="number" value={item.price} onChange={e => setItem({...item, price: e.target.value})} style={inputStyle} />
          <input placeholder="Сезоны (через запятую)" value={item.seasons} onChange={e => setItem({...item, seasons: e.target.value})} style={inputStyle} />
          
          <button type="submit" disabled={loading} style={buttonStyle(loading)}>
            {loading ? "Сохранение..." : "Добавить в базу"}
          </button>
        </form>
      </div>

      {/* Сетка гардероба с CPW */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: "15px" }}>Мой шкаф ({wardrobe.length})</h3>
        <div style={gridStyle}>
          {wardrobe.map(i => (
            <div key={i.id} style={itemCardStyle}>
              <span style={{ fontWeight: "bold" }}>{i.subcategory || i.category}</span>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{i.material} | {i.color_primary}</span>
              <div style={cpwTagStyle}>
                CPW: {i.cpw ? `${Math.round(i.cpw)} ₽` : `${i.purchase_price} ₽`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Улучшенные стили для стартапа ---
const containerStyle = { minHeight: "100vh", padding: "20px", backgroundColor: "#0b0c10", color: "#fff", fontFamily: "system-ui, sans-serif" };
const cardStyle = { background: "#151822", padding: "20px", borderRadius: "16px", marginBottom: "20px", maxWidth: "500px", margin: "0 auto 20px", border: "1px solid #222" };
const profileHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: "500px", margin: "0 auto 20px", background: "#151822", padding: "12px 20px", borderRadius: "16px" };
const avatarStyle = { width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #00e6b8' };
const tierBadgeStyle = { margin: 0, fontSize: '10px', textTransform: 'uppercase', color: '#00e6b8', letterSpacing: '1px' };
const logoutButtonStyle = { background: "none", color: "#ff4d4d", border: "1px solid #ff4d4d", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" };
const inputStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#1c1f26", color: "#fff", marginBottom: "10px", outline: "none" };
const formStyle = { display: 'flex', flexDirection: 'column' };
const buttonStyle = (loading) => ({ padding: "14px", borderRadius: "8px", border: "none", background: loading ? "#444" : "#00e6b8", color: "#000", fontWeight: "bold", cursor: "pointer", transition: "0.3s" });
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
const itemCardStyle = { background: "#1c1f26", padding: "15px", borderRadius: "12px", border: "1px solid #333", display: 'flex', flexDirection: 'column', gap: '4px' };
const cpwTagStyle = { marginTop: '8px', padding: '4px 8px', background: 'rgba(0, 230, 184, 0.1)', color: '#00e6b8', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', width: 'fit-content' };

export default App;