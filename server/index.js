import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pkg;
const app = express();

const PORT = process.env.PORT || 8080; 

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ai-stylist-production-7f72.up.railway.app", 
    "X-Title": "AI Stylist Pro",
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Инициализация Supabase Storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const TIER_LIMITS = { free: 20, paid: 200, vip: Infinity };

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        picture TEXT,
        subscription_tier TEXT DEFAULT 'free',
        style_preferences TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

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

// --- 4. РОУТЫ ---

// РОУТ 1: ИИ ОЦЕНКА ФОТО 
app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body; 
    if (!image) return res.status(400).json({ error: "Картинка не предоставлена" });

    // ВАЖНО: Для оценки фото нужна Vision-модель. Qwen Instruct слепая, поэтому здесь Gemini Flash
    const response = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl:free", 
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `YOU ARE A WORLD-RENOWNED FASHION STYLIST AND IMAGE CONSULTANT, 
WINNER OF THE INTERNATIONAL STYLE AWARD 2024 AND PERSONAL BRAND EXPERT FOR CELEBRITIES AND BUSINESS LEADERS.

YOUR TASK IS TO ПРОАНАЛИЗИРОВАТЬ СТИЛЬ ОБРАЗА ЧЕЛОВЕКА ПО ОПИСАНИЮ ИЛИ ИЗОБРАЖЕНИЮ И ДАТЬ ПРОФЕССИОНАЛЬНУЮ ОЦЕНКУ.

ЦЕЛЬ АНАЛИЗА:
- Определить стиль (классический, casual, streetwear, business, smart casual, минимализм и т.д.).
- Оценить гармоничность образа.
- Проанализировать сочетание цветов, фактур и силуэта.
- Дать рекомендации по улучшению.
- Оценить уместность образа для конкретного случая (если указан контекст).

CHAIN OF THOUGHTS:
1. Определи контекст: Где может использоваться этот образ? Какую цель он транслирует?
2. Проанализируй элементы одежды: Верх, Низ, Обувь, Аксессуары, Цветовую палитру, Текстуры.
3. Оцени композицию: Баланс пропорций, Соответствие силуэту, Цветовую гармонию.
4. Определи сильные стороны образа.
5. Выяви слабые стороны (если есть).
6. Дай конкретные рекомендации.

ФОРМАТ ОТВЕТА:
- Краткое общее впечатление (2–3 предложения).
- Детальный разбор по пунктам.
- Рекомендации.

ТВОЙ АНАЛИЗ ДОЛЖЕН БЫТЬ ПРОФЕССИОНАЛЬНЫМ, СТРУКТУРИРОВАННЫМ, КОНСТРУКТИВНЫМ И ЭКСПЕРТНЫМ.` 
            },
            {
              type: "image_url",
              image_url: { url: image },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const verdict = response.choices[0].message.content;
    res.json({ verdict });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "Ошибка при анализе образа ИИ" });
  }
});

// РОУТ 2: ИИ ГЕНЕРАЦИЯ ОБРАЗА
app.post('/api/generate-outfit', async (req, res) => {
  try {
    const { occasion, wardrobe, preferences } = req.body;
    
    // 1. Базовая роль
    let prompt = `Ты топовый персональный стилист. Твоя задача — собрать актуальный, современный образ для ситуации: "${occasion}". Никаких устаревших трендов. Учитывай сочетаемость текстур (например, шерсть и деним) и правило трех цветов.\n\n`;

    // 2. Учитываем предпочтения (ЕСЛИ ОНИ ЕСТЬ)
    if (preferences && preferences.length > 0) {
      prompt += `ВНИМАНИЕ НА СТИЛЬ: Клиент предпочитает следующие эстетики: ${preferences.join(', ')}. Учитывай это при создании образа!\n\n`;
    }

    // 3. Учитываем гардероб (ЕСЛИ ОН ЕСТЬ)
    if (wardrobe && wardrobe.length > 0) {
      const wardrobeText = wardrobe.map(w => `${w.subcategory} (цвет: ${w.color_primary}, материал: ${w.material || 'базовый'})`).join('; ');
      prompt += `ВНИМАНИЕ! Ты ОБЯЗАН использовать вещи из личного гардероба клиента. Вот его вещи: [${wardrobeText}]. 
Выбери основу образа (верх и низ) строго из этого списка! Если для идеального лука не хватает акцента (например, обуви или куртки), предложи, что конкретно стоит докупить.\n\n`;
    } else {
      prompt += `У клиента пока пустой виртуальный шкаф. Предложи стильную капсулу из универсальных базовых вещей, которые легко найти в масс-маркете (Zara, Massimo Dutti, Uniqlo). Вещи должны быть взаимозаменяемыми.\n\n`;
    }

    prompt += `Ответ должен быть стильным, использовать эмодзи и быть структурированным:
    1. 💡 Идея образа (1-2 предложения).
    2. 👕 Верх: ...
    3. 👖 Низ: ...
    4. 👟 Обувь: ...
    5. 🕶 Аксессуары: ...`;

    const response = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl:free", 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
    });

    res.json({ outfit: response.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI Generate Error:", error);
    res.status(500).json({ error: "Ошибка генерации образа" });
  }
});

// РАСПОЗНАВАНИЯ ВЕЩИ И СОХРАНЕНИЯ В SUPABASE
app.post('/api/auto-tag-item', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Нет картинки" });

    const prompt = `Распознай вещь на фото и верни строго валидный JSON. 
Используй ТОЛЬКО эти значения для ключей:
- category: ["Верх", "Низ", "Обувь", "Верхняя одежда", "Аксессуары", "Сумка"]
- color_primary: ["Черный", "Белый", "Серый", "Бежевый", "Синий", "Голубой", "Красный", "Зеленый", "Коричневый", "Желтый", "Розовый", "Разноцветный"]
- material: ["Хлопок", "Деним", "Шерсть", "Кожа", "Лен", "Синтетика", "Шелк", "Трикотаж", "Смесовая ткань", "Неизвестно"]
- seasons: ["Лето", "Зима", "Демисезон", "Мультисезон"]

Формат ответа СТРОГО:
{
  "category": "...",
  "subcategory": "Например: Футболка, Джинсы, Кроссовки",
  "color_primary": "...",
  "material": "...",
  "seasons": "..."
}`;

    const aiResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3.2-11b-vision-instruct", // Используем бесплатную Vision модель
      messages: [
        { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64 } }] }
      ]
    });

    let cleanJson = aiResponse.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const itemData = JSON.parse(cleanJson);

    // Сохраняем картинку в Supabase Storage
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, ""); 
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `item_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('wardrobe_images') 
      .upload(fileName, buffer, { contentType: 'image/png' });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('wardrobe_images').getPublicUrl(fileName);
    
    res.json({ item: itemData, imageUrl: publicUrlData.publicUrl });

  } catch (error) {
    console.error("Auto-tag error:", error);
    res.status(500).json({ error: "Ошибка распознавания вещи" });
  }
});

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

app.post("/wardrobe", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // ТЕПЕРЬ СОХРАНЯЕМ ЕЩЕ И ССЫЛКУ НА КАРТИНКУ
    const { category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url } = req.body;

    const userStatus = await pool.query(
      `SELECT subscription_tier, (SELECT COUNT(*) FROM wardrobe_items WHERE user_id = $1) as current_count FROM users WHERE id = $1`, [userId]
    );

    const { subscription_tier, current_count } = userStatus.rows[0];
    const limit = TIER_LIMITS[subscription_tier] || 20;

    if (parseInt(current_count) >= limit) {
      return res.status(403).json({ error: `Лимит достигнут! На тарифе ${subscription_tier} доступно ${limit} мест.`, is_limit_reached: true });
    }

    const result = await pool.query(
      `INSERT INTO wardrobe_items (user_id, category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, category, subcategory, color_primary, material, style, purchase_price || 0, seasons, occasions, image_url]
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
      `SELECT *, (purchase_price / NULLIF(wear_count, 0)) as cpw FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Ошибка загрузки гардероба" });
  }
});

// --- ОБНОВЛЕНИЕ ВЕЩИ (EDIT) ---
app.put("/wardrobe/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      // ОБНОВЛЯЕМ И КАРТИНКУ ТОЖЕ
      const { category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url } = req.body;
  
      const result = await pool.query(
        `UPDATE wardrobe_items 
         SET category = $1, subcategory = $2, color_primary = $3, material = $4, style = $5, purchase_price = $6, seasons = $7, occasions = $8, image_url = $9
         WHERE id = $10 AND user_id = $11 RETURNING *`,
        [category, subcategory, color_primary, material, style, purchase_price || 0, seasons, occasions, image_url, id, userId]
      );
  
      if (result.rows.length === 0) return res.status(404).json({ error: "Вещь не найдена" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления вещи" });
    }
  });
  
  // --- УДАЛЕНИЕ ВЕЩИ (DELETE) ---
  app.delete("/wardrobe/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
  
      const result = await pool.query(
        `DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
  
      if (result.rows.length === 0) return res.status(404).json({ error: "Вещь не найдена" });
      res.json({ message: "Удалено успешно" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления вещи" });
    }
  });

  // РОУТ 3: СОХРАНЕНИЕ ПРЕДПОЧТЕНИЙ СТИЛЯ В ПРОФИЛЬ
app.put("/api/user/preferences", authenticateToken, async (req, res) => {
    try {
      const { preferences } = req.body;
      
      const result = await pool.query(
        `UPDATE users SET style_preferences = $1 WHERE id = $2 RETURNING *`,
        [preferences, req.user.id]
      );
      
      // Возвращаем обновленного юзера (без лишних данных)
      const updatedUser = result.rows[0];
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Preferences Error:", error);
      res.status(500).json({ error: "Ошибка сохранения предпочтений" });
    }
  });

  // Запуск сервера
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI Stylist Server запущен на порту ${PORT}`);
});