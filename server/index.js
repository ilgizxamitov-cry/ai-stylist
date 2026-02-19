import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query("SELECT NOW()")
  .then(res => {
    console.log("🟢 DB connected:", res.rows[0]);
  })
  .catch(err => {
    console.error("🔴 DB connection error:", err);
  });

  pool.query(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category VARCHAR(50) NOT NULL,
      color VARCHAR(50),
      season VARCHAR(50),
      occasion VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  .then(() => console.log("🟢 wardrobe_items table ready"))
  .catch(err => console.error("🔴 Table creation error:", err));
  

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Отладка: проверяем, загрузился ли ключ
console.log("🔍 Проверка переменных окружения:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ найден" : "❌ не найден");
console.log("Путь к .env:", path.resolve(__dirname, "../.env"));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  

app.post("/analyze", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты профессиональный стилист. Проанализируй женский образ. Ответ строго в JSON с полями verdict, mistakes, improvements, shopping_tips.",
        },
        {
          role: "user",
          content: "Проанализируй образ на фото.",
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    res.json(result);
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "Ошибка анализа" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Stylist AI server запущен на порту ${PORT}`);
});