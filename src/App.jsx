import React, { useState, useEffect } from "react";

const API_URL = "https://ai-stylist-production-7f72.up.railway.app";

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [wardrobe, setWardrobe] = useState([]);
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");

  /* =============================
     IMAGE ANALYSIS
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

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
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
      setWardrobe(data);
    } catch (error) {
      console.error("Load wardrobe error:", error);
    }
  };

  useEffect(() => {
    fetchWardrobe();
  }, []);

  const handleAddItem = async () => {
    if (!category || !color) return;

    try {
      await fetch(`${API_URL}/wardrobe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  const isAnalyzeDisabled = !selectedImage || loading;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#0b0c10",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center" }}>AI Stylist</h1>

      {/* ================= ANALYZE BLOCK ================= */}

      <div style={cardStyle}>
        <h2>Анализ образа</h2>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzeDisabled}
          style={buttonStyle(isAnalyzeDisabled)}
        >
          {loading ? "Анализируем..." : "Анализировать образ"}
        </button>

        <div style={{ marginTop: 15 }}>
          {result ? (
            <div>
              {result.verdict && (
                <>
                  <strong>Вердикт:</strong>
                  <p>{result.verdict}</p>
                </>
              )}

              {result.mistakes?.length > 0 && (
                <>
                  <strong>Ошибки:</strong>
                  <ul>
                    {result.mistakes.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </>
              )}

              {result.improvements?.length > 0 && (
                <>
                  <strong>Улучшения:</strong>
                  <ul>
                    {result.improvements.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p style={{ opacity: 0.6 }}>
              Результат появится после анализа.
            </p>
          )}
        </div>
      </div>

      {/* ================= WARDROBE BLOCK ================= */}

      <div style={cardStyle}>
        <h2>Мой гардероб</h2>

        <input
          placeholder="Категория"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          placeholder="Цвет"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          placeholder="Сезон"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        />
        <input
          placeholder="Повод"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />

        <button onClick={handleAddItem} style={buttonStyle(false)}>
          Добавить вещь
        </button>

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
