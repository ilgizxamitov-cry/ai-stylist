import React, { useState } from "react";

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setSelectedImage(file);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage || loading) return;
  
    setLoading(true);
    setResult(null);
  
    try {
      const response = await fetch("https://ai-stylist-production-7f72.up.railway.app/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
  
      if (!response.ok) {
        console.error("Ошибка при запросе /analyze:", response.status);
        setResult(null);
        return;
      }
  
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Сетевой ошибка при запросе /analyze:", error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isAnalyzeDisabled = !selectedImage || loading;

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0b0c10",
        color: "#ffffff",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Заголовок */}
      <header
        style={{
          padding: "16px 0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          AI Stylist
        </h1>
      </header>

      {/* Центральный контейнер */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            borderRadius: "16px",
            padding: "24px 20px",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.12), transparent 60%), rgba(19, 22, 30, 0.95)",
            boxShadow: "0 18px 45px rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(22px)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "8px",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Анализ образа
          </h2>

          <p
            style={{
              marginTop: 0,
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            Загрузите фото вашего образа, а затем нажмите{" "}
            <strong>«Анализировать образ»</strong>. Сейчас используется
            mock-результат без реального API.
          </p>

          {/* Зона загрузки файла */}
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 14px 12px",
              borderRadius: "12px",
              border: "1px dashed rgba(255,255,255,0.25)",
              backgroundColor: "rgba(6, 8, 12, 0.8)",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 16px",
                borderRadius: "999px",
                background:
                  "linear-gradient(135deg, #ff7e5f 0%, #feb47b 50%, #ff6cab 100%)",
                color: "#0b0c10",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              Выбрать фото
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {selectedImage ? (
                <span>
                  Выбрано:{" "}
                  <span style={{ fontWeight: 500 }}>{selectedImage.name}</span>
                </span>
              ) : (
                <span>Файл ещё не выбран.</span>
              )}
            </div>
          </div>

          {/* Кнопка анализа */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzeDisabled}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "999px",
              border: "none",
              cursor: isAnalyzeDisabled ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              background: isAnalyzeDisabled
                ? "rgba(255,255,255,0.12)"
                : "linear-gradient(135deg, #41e8b4, #2fd2ff)",
              color: isAnalyzeDisabled ? "rgba(255,255,255,0.5)" : "#020308",
              transition:
                "transform 0.12s ease-out, box-shadow 0.12s ease-out, background 0.15s ease-out, opacity 0.12s ease-out",
              boxShadow: isAnalyzeDisabled
                ? "none"
                : "0 12px 30px rgba(0, 255, 200, 0.35)",
              opacity: loading ? 0.9 : 1,
            }}
          >
            {loading ? "Анализируем образ..." : "Анализировать образ"}
          </button>

          {/* Результат анализа / подсказка */}
          <div
            style={{
              marginTop: "18px",
              paddingTop: "14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: "13px",
            }}
          >
            {result ? (
              // ... остальной JSX ...
              <div
  style={{
    marginTop: "18px",
    paddingTop: "14px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: "13px",
  }}
>
  {result ? (
    <div
      style={{
        backgroundColor: "rgba(5, 10, 18, 0.85)",
        borderRadius: "10px",
        padding: "12px 12px 10px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {result.verdict && (
        <>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            Вердикт
          </div>
          <p
            style={{
              marginTop: 0,
              marginBottom: "10px",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {result.verdict}
          </p>
        </>
      )}

      {Array.isArray(result.mistakes) && result.mistakes.length > 0 && (
        <>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "4px",
              marginTop: "6px",
            }}
          >
            Ошибки в образе
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              listStyleType: "disc",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {result.mistakes.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "3px" }}>
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(result.improvements) && result.improvements.length > 0 && (
        <>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "4px",
              marginTop: "8px",
            }}
          >
            Как улучшить
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              listStyleType: "disc",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {result.improvements.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "3px" }}>
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(result.shopping_tips) &&
        result.shopping_tips.length > 0 && (
          <>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Подсказки для шопинга
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                listStyleType: "disc",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {result.shopping_tips.map((item, idx) => (
                <li key={idx} style={{ marginBottom: "3px" }}>
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
    </div>
  ) : (
    <p
      style={{
        margin: 0,
        color: "rgba(255,255,255,0.6)",
      }}
    >
      Результат появится здесь после анализа. Для начала выберите фото
      и нажмите кнопку.
    </p>
  )}
</div>

// ... остальной JSX ...
            ) : (
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Результат появится здесь после анализа. Для начала выберите фото
                и нажмите кнопку.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;