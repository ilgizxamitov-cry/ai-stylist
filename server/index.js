import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 8080; // Railway часто использует 8080
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Константы лимитов согласно твоей бизнес-модели
const TIER_LIMITS = {
  free: 20,
  paid: 200,
  vip: Infinity
};

const initDB = async () => {
  try {
    // 1. Таблица пользователей с полем подписки
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        picture TEXT,
        subscription_tier TEXT DEFAULT 'free',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Расширенная таблица вещей для ИИ-анализа и CPW
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wardrobe_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        subcategory TEXT,
        color_primary TEXT,
        color_secondary TEXT,
        material TEXT,
        pattern TEXT DEFAULT 'plain',
        style TEXT,
        seasons TEXT[], 
        occasions TEXT[],
        purchase_price NUMERIC DEFAULT 0,
        wear_count INTEGER DEFAULT 0,
        temp_min INTEGER,
        temp_max INTEGER,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("🟢 Таблицы БД обновлены и готовы");
  } catch (err) {
    console.error("🔴 Ошибка БД:", err);
  }
};
initDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- Middleware авторизации ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Токен отсутствует' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

// --- Роуты ---

app.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

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
    res.status(401).json({ error: "Ошибка Google Auth" });
  }
});

// Добавление вещи с проверкой лимитов (20/200/unlimit)
app.post("/wardrobe", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      category, subcategory, color_primary, material, 
      style, purchase_price, seasons, occasions 
    } = req.body;

    // 1. Проверка лимита согласно уровню подписки
    const userStatus = await pool.query(
      `SELECT subscription_tier, 
        (SELECT COUNT(*) FROM wardrobe_items WHERE user_id = $1) as current_count
       FROM users WHERE id = $1`, [userId]
    );

    const { subscription_tier, current_count } = userStatus.rows[0];
    const limit = TIER_LIMITS[subscription_tier] || 20;

    if (parseInt(current_count) >= limit) {
      return res.status(403).json({ 
        error: `Лимит достигнут! На тарифе ${subscription_tier} доступно ${limit} мест.`,
        is_limit_reached: true 
      });
    }

    // 2. Сохранение вещи
    const result = await pool.query(
      `INSERT INTO wardrobe_items 
       (user_id, category, subcategory, color_primary, material, style, purchase_price, seasons, occasions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, category, subcategory, color_primary, material, style, purchase_price || 0, seasons, occasions]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Не удалось добавить вещь" });
  }
});

app.get("/wardrobe", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *, 
       (purchase_price / NULLIF(wear_count, 0)) as cpw 
       FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Ошибка загрузки гардероба" });
  }
});

// Удалено дублирование /analyze. Оставлен режим MOCK_AI для экономии.
const isMockMode = process.env.MOCK_AI === "true";
app.post("/analyze", authenticateToken, async (req, res) => {
  try {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return res.json({
        verdict: "Режим отладки: Образ выглядит отлично!",
        mistakes: [],
        improvements: ["Добавьте аксессуар."],
        shopping_tips: ["Базовая белая рубашка."]
      });
    }
    // Здесь логика OpenAI Vision...
  } catch (error) {
    res.status(500).json({ error: "Ошибка анализа" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI Stylist Server запущен на порту ${PORT}`);
});