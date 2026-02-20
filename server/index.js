import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";

// 1. Сначала загружаем конфиг
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 2. Настройка БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Инициализация таблиц (Добавил таблицу пользователей и цену для CPW)
const initDB = async () => {
  try {
    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Таблица вещей (добавил purchase_price)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wardrobe_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        category VARCHAR(50) NOT NULL,
        color VARCHAR(50),
        season VARCHAR(50),
        occasion VARCHAR(100),
        purchase_price NUMERIC(10, 2) DEFAULT 0,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("🟢 Таблицы БД готовы");
  } catch (err) {
    console.error("🔴 Ошибка инициализации БД:", err);
  }
};
initDB();

// 3. Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Увеличил лимит для base64 фото

// 4. Роуты

// Авторизация Google (с сохранением в БД)
app.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Находим или создаем пользователя (Upsert)
    const dbUser = await pool.query(
      `INSERT INTO users (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET name = $3, picture = $4
       RETURNING *`,
      [payload.sub, payload.email, payload.name, payload.picture]
    );

    const user = dbUser.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// Анализ образа с OpenAI Vision

// В начале файла можно добавить простую проверку
const isMockMode = process.env.MOCK_AI === "true";

app.post("/analyze", async (req, res) => {
  try {
    console.log("🔍 Запрос на анализ получен. Режим заглушки:", isMockMode);

    if (isMockMode) {
      // Имитируем задержку сети 1.5 секунды, чтобы UI выглядел реалистично
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockResponses = [
        {
          verdict: "Отличный кэжуал образ! Цвета гармонируют.",
          mistakes: ["Слишком массивная обувь для такого легкого верха."],
          improvements: ["Добавь тонкий кожаный ремень в цвет обуви."],
          shopping_tips: ["Белая базовая футболка из плотного хлопка."]
        },
        {
          verdict: "Интересное сочетание, но не для офиса.",
          mistakes: ["Цвет сумки конфликтует с принтом на юбке."],
          improvements: ["Замени сумку на нейтральную бежевую."],
          shopping_tips: ["Минималистичные лоферы."]
        }
      ];

      // Возвращаем случайный ответ из списка
      const randomResult = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      return res.json(randomResult);
    }

    // --- Дальше идет твой реальный код с OpenAI (он не выполнится, если MOCK_AI=true) ---
    // const completion = await openai.chat.completions.create({...});
    // ...
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body; // Ожидаем base64 строку от фронтенда

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ты профессиональный стилист. Ответ строго в JSON: {verdict, mistakes, improvements, shopping_tips}."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Проанализируй мой образ на этом фото." },
            { type: "image_url", image_url: { url: image } } // Здесь передаем само изображение
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "Ошибка анализа" });
  }
});

// Добавление вещи
app.post("/wardrobe", async (req, res) => {
  try {
    const { user_id, category, color, season, occasion, purchase_price } = req.body;
    const result = await pool.query(
      `INSERT INTO wardrobe_items (user_id, category, color, season, occasion, purchase_price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, category, color, season, occasion, purchase_price || 0]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

// Получение гардероба
app.get("/wardrobe/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wardrobe" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI Stylist Server запущен на порту ${PORT}`);
});