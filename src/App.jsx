import React, { useState, useEffect } from "react";

const API_URL = "https://ai-stylist-production-7f72.up.railway.app";

function App() {
  // --- Состояние ---
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [wardrobe, setWardrobe] = useState([]);
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");

  // --- Инициализация Google Auth ---
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "ТВОЙ_GOOGLE_CLIENT_ID", // Замени на реальный ID
        callback: handleGoogleLogin,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large" }
      );
    }
    fetchWardrobe();
  }, []);

  const handleGoogleLogin = async (response) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setUser(data.user);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  /* =============================
      IMAGE ANALYSIS (Исправлено)
  ============================== */
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage || loading) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("image", selectedImage); // Отправляем реальный файл

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        // При отправке FormData заголовок Content-Type ставить НЕ НУЖНО, браузер сделает это сам
        body: formData, 
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analyze error:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =============================
      WARDROBE
  ============================== */
  const fetchWardrobe = async () => {
    try {
      const response = await fetch(`${API_URL}/wardrobe/1`);
      const data = await response.json();
      setWardrobe(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load wardrobe error:", error);
    }
  };

  const handleAddItem = async () => {
    if (!category || !color) return;

    try {
      await fetch(`${API_URL}/wardrobe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          category,
          color,
          season,
          occasion,
        }),
      });

      setCategory("");
      setColor("");
      setSeason("");
      setOccasion("");
      fetchWardrobe();
    } catch (error) {
      console.error("Add item error:", error);
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ textAlign: "center" }}>AI Stylist</h1>

      {/* Блок авторизации */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        {!user ? (
           <div id="googleSignInDiv"></div>
        ) : (
           <p>Привет, {user.firstName || 'Стильный пользователь'}!</p>
        )}
      </div>

      {/* ================= ANALYZE BLOCK ================= */}
      <div style={cardStyle}>
        <h2>Анализ образа</h2>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button
          onClick={handleAnalyze}
          disabled={!selectedImage || loading}
          style={buttonStyle(!selectedImage || loading)}
        >
          {loading ? "Анализируем..." : "Анализировать образ"}
        </button>

        <div style={{ marginTop: 15 }}>
          {result ? (
            <div>
              {result.verdict && (
                <p><strong>Вердикт:</strong> {result.verdict}</p>
              )}
              {result.mistakes?.length > 0 && (
                <div>
                  <strong>Ошибки:</strong>
                  <ul>{result.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ opacity: 0.6 }}>Результат появится после анализа.</p>
          )}
        </div>
      </div>

      {/* ================= WARDROBE BLOCK ================= */}
      <div style={cardStyle}>
        <h2>Мой гардероб</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input placeholder="Категория" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input placeholder="Цвет" value={color} onChange={(e) => setColor(e.target.value)} />
            <input placeholder="Сезон" value={season} onChange={(e) => setSeason(e.target.value)} />
            <input placeholder="Повод" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
            <button onClick={handleAddItem} style={buttonStyle(false)}>Добавить вещь</button>
        </div>

        <ul style={{ marginTop: 15 }}>
          {wardrobe.map((item) => (
            <li key={item.id}>
              {item.category} — {item.color} ({item.season})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const containerStyle = {
  minHeight: "100vh",
  padding: "20px",
  backgroundColor: "#0b0c10",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle = {
  background: "#151822",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const buttonStyle = (disabled) => ({
  marginTop: "10px",
  padding: "8px 14px",
  borderRadius: "6px",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  background: disabled ? "#555" : "#00e6b8",
  color: "#000",
  fontWeight: 600,
});

export default App;