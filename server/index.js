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
import { client } from "@gradio/client";

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
  defaultHeaders: { "HTTP-Referer": "https://ai-stylist.app", "X-Title": "AI Stylist Pro" }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const initDB = async () => { /* Таблицы уже созданы */ };
initDB();

app.use(cors());
app.use(express.json({ limit: "15mb" })); 

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

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body; 
    if (!image) return res.status(400).json({ error: "Картинка не предоставлена" });

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini", 
      messages: [{ role: "user", content: [
            { type: "text", text: `Оцени образ как профессиональный стилист. Дай оценку стилю, цветам и пропорциям. Кратко и емко.` },
            { type: "image_url", image_url: { url: image } }
      ]}],
      max_tokens: 1000,
    });
    res.json({ verdict: response.choices[0].message.content });
  } catch (error) { res.status(500).json({ error: "Ошибка ИИ" }); }
});

app.post('/api/generate-outfit', async (req, res) => {
    try {
      const { occasion, wardrobe, preferences } = req.body;
      let prompt = `Ты персональный стилист. Собери образ для: "${occasion}".\n`;
      if (preferences && preferences.length > 0) prompt += `Стиль клиента: ${preferences.join(', ')}.\n`;
      
      if (wardrobe && wardrobe.length > 0) {
        // Передаем ИИ список вещей ВМЕСТЕ С ИХ ID
        const wText = wardrobe.map(w => `[ID:${w.id}] ${w.subcategory} (цвет: ${w.color_primary})`).join('; ');
        prompt += `ОБЯЗАТЕЛЬНО используй вещи клиента из этого списка: ${wText}.\n\n`;
      } else {
        prompt += `Предложи капсулу из базовых вещей.\n\n`;
      }
  
      prompt += `Верни ответ СТРОГО в формате JSON:
  {
    "text": "Твой красивый текст с описанием образа, поделенный на абзацы с эмодзи",
    "top_item_id": число (ID выбранного верха из списка, или null если нет),
    "bottom_item_id": число (ID выбранного низа из списка, или null)
  }`;
  
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini", 
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      });
  
      let cleanJson = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      res.json(JSON.parse(cleanJson));
    } catch (error) { 
      console.error("Outfit error:", error);
      res.status(500).json({ error: "Ошибка генерации" }); 
    }
  });

// --- БЕСПЛАТНАЯ МАГИЯ: РАСПОЗНАВАНИЕ И СОХРАНЕНИЕ ---
app.post('/api/auto-tag-item', authenticateToken, async (req, res) => {
  try {
    // Сюда приходит УЖЕ ОЧИЩЕННАЯ фронтендом картинка!
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Нет картинки" });

    // 1. Просим ИИ описать вещь
    const prompt = `Внимательно посмотри на фото. Найди ГЛАВНЫЙ элемент одежды.
Верни строго ОДИН валидный JSON объект.
Используй ТОЛЬКО эти значения:
- category: ["Верх", "Низ", "Обувь", "Верхняя одежда", "Аксессуары", "Сумка"]
- color_primary: ["Черный", "Белый", "Серый", "Бежевый", "Синий", "Голубой", "Красный", "Зеленый", "Коричневый", "Желтый", "Розовый", "Разноцветный"]
- material: ["Хлопок", "Деним", "Шерсть", "Кожа", "Лен", "Синтетика", "Шелк", "Трикотаж", "Смесовая ткань", "Неизвестно"]
- seasons: ["Лето", "Зима", "Демисезон", "Мультисезон"]

Формат ответа СТРОГО:
{
  "category": "...",
  "subcategory": "Например: Футболка",
  "color_primary": "...",
  "material": "...",
  "seasons": "..."
}`;

    const aiResponse = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini", 
      messages: [ { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64 } }] } ]
    });

    let cleanJson = aiResponse.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const itemData = JSON.parse(cleanJson);

    // 2. Сохраняем готовую картинку в Supabase
    const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, ""); 
    const buffer = Buffer.from(rawBase64, 'base64');
    const fileName = `item_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage.from('wardrobe_images').upload(fileName, buffer, { contentType: 'image/png' });

    if (uploadError) throw uploadError;

    // 3. Отдаем публичную ссылку фронтенду
    const { data: publicUrlData } = supabase.storage.from('wardrobe_images').getPublicUrl(fileName);
    
    res.json({ item: itemData, imageUrl: publicUrlData.publicUrl });

  } catch (error) {
    console.error("Auto-tag error:", error);
    res.status(500).json({ error: "Ошибка распознавания вещи" });
  }
});

// --- МАГИЯ 3: РАСПОЗНАВАНИЕ ГОЛОСА (ТЕКСТА) ---
app.post('/api/parse-voice', authenticateToken, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Нет текста" });
  
      // Просим ИИ вытащить все вещи из текста
      const prompt = `Пользователь надиктовал список одежды. Вытащи ВСЕ элементы одежды из текста и верни СТРОГО массив JSON объектов.
  Используй ТОЛЬКО эти значения:
  - category: ["Верх", "Низ", "Обувь", "Верхняя одежда", "Аксессуары", "Сумка"]
  - color_primary: ["Черный", "Белый", "Серый", "Бежевый", "Синий", "Голубой", "Красный", "Зеленый", "Коричневый", "Желтый", "Розовый", "Разноцветный"]
  - material: ["Хлопок", "Деним", "Шерсть", "Кожа", "Лен", "Синтетика", "Шелк", "Трикотаж", "Смесовая ткань", "Неизвестно"]
  - seasons: ["Лето", "Зима", "Демисезон", "Мультисезон"]
  
  Формат ответа СТРОГО:
  [
    { "category": "...", "subcategory": "Например: Футболка, Джинсы", "color_primary": "...", "material": "...", "seasons": "..." }
  ]
  
  Текст пользователя: "${text}"`;
  
      const aiResponse = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini", // Наш любимый быстрый и дешевый gpt-4o-mini
        messages: [ { role: "user", content: prompt } ]
      });
  
      let cleanJson = aiResponse.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const itemsArray = JSON.parse(cleanJson);
  
      res.json({ items: itemsArray });
  
    } catch (error) {
      console.error("Voice parse error:", error);
      res.status(500).json({ error: "Ошибка парсинга голоса ИИ" });
    }
  });

  // --- МАГИЯ 4: ОПРЕДЕЛЕНИЕ ТИПА ФИГУРЫ И СОХРАНЕНИЕ В ПРОФИЛЬ (ДЛЯ VTON) ---
app.post('/api/analyze-person', authenticateToken, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      const userId = req.user.id;
      if (!imageBase64) return res.status(400).json({ error: "Нет картинки" });
  
      // 1. ИИ анализирует внешность
      const prompt = `Ты — элитный персональный стилист. Внимательно изучи фото человека во весь рост.
  Твоя задача — составить персональный "Style ID" (ДНК стиля) для этого клиента.
  Определи и опиши:
  1. 🎨 ЦВЕТОТИП: сезон (Зима, Весна, Лето, Осень). 3-4 идеальных цвета и 2 цвета, которых избегать.
  2. 📐 ТИП ФИГУРЫ: тип (Песочные часы, Прямоугольник, Груша и т.д.).
  3. 👗 ФАСОНЫ: 3 рекомендации по крою одежды.
  Пиши структурированно, доброжелательно, используй эмодзи.`;
  
      const aiResponse = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64 } }] }],
        max_tokens: 1000,
      });
      
      const analysisText = aiResponse.choices[0].message.content;
  
      // 2. Сохраняем фото в Supabase (для будущей примерочной VTON)
      const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, ""); 
      const buffer = Buffer.from(rawBase64, 'base64');
      const fileName = `vton_${userId}_${Date.now()}.png`;
  
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from('wardrobe_images') 
        .upload(fileName, buffer, { contentType: 'image/png' });
  
      if (uploadError) throw uploadError;
  
      const { data: publicUrlData } = supabase.storage.from('wardrobe_images').getPublicUrl(fileName);
      const vtonImageUrl = publicUrlData.publicUrl;
  
      // 3. Обновляем профиль пользователя в Базе Данных
      const result = await pool.query(
        `UPDATE users SET style_analysis = $1, vton_image = $2 WHERE id = $3 RETURNING *`,
        [analysisText, vtonImageUrl, userId]
      );
  
      // Возвращаем обновленного юзера на фронтенд
      res.json({ user: result.rows[0] });
  
    } catch (error) {
      console.error("Person analysis error:", error);
      res.status(500).json({ error: "Ошибка анализа внешности" });
    }
  });

  // --- МАГИЯ 5: ВИРТУАЛЬНАЯ ПРИМЕРОЧНАЯ (HUGGING FACE) ---
app.post('/api/try-on', authenticateToken, async (req, res) => {
    try {
      const { garmentUrl } = req.body; 
      const userId = req.user.id;
  
      if (!garmentUrl) return res.status(400).json({ error: "Нет ссылки на вещь" });
  
      // 1. Достаем фото юзера из базы данных (которое мы сохраняли в Профиле)
      const userRes = await pool.query(`SELECT vton_image FROM users WHERE id = $1`, [userId]);
      const personImageUrl = userRes.rows[0]?.vton_image;
  
      if (!personImageUrl) {
        return res.status(400).json({ error: "Сначала загрузите свое фото во весь рост во вкладке Профиль!" });
      }
  
      // 2. Отправляем запрос на бесплатный сервер Hugging Face (модель IDM-VTON)
      const hfClient = await client("yisol/IDM-VTON");
      
      const result = await hfClient.predict("/tryon", [
        { background: personImageUrl, layers: [], composite: null }, // dict: Фото человека
        garmentUrl, // Фото одежды (чистое, без фона)
        "Upper body clothing", // Описание
        true, // Авто-кроп
        true, // Авто-кроп и ресайз
        30,   // Качество (denoise steps)
        42    // Seed
      ]);
  
      // 3. Получаем готовую картинку!
      const generatedImageUrl = result.data[0].url;
      res.json({ resultUrl: generatedImageUrl });
  
    } catch (error) {
      console.error("VTON error:", error);
      res.status(500).json({ error: "Сервер примерки сейчас перегружен. Попробуйте через минуту!" });
    }
  });

// --- РОУТЫ БД ---
app.post("/auth/google", async (req, res) => { /*...*/ 
  const { credential } = req.body;
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const dbUser = await pool.query(
    `INSERT INTO users (google_id, email, name, picture) VALUES ($1, $2, $3, $4) ON CONFLICT (google_id) DO UPDATE SET name = $3, picture = $4 RETURNING *`,
    [payload.sub, payload.email, payload.name, payload.picture]
  );
  const token = jwt.sign({ id: dbUser.rows[0].id, email: dbUser.rows[0].email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: dbUser.rows[0] });
});

app.post("/wardrobe", authenticateToken, async (req, res) => {
  try {
    const { category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO wardrobe_items (user_id, category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, category, subcategory, color_primary, material, style, purchase_price || 0, seasons, occasions, image_url]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Ошибка" }); }
});

app.get("/wardrobe", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Ошибка" }); }
});

app.put("/wardrobe/:id", authenticateToken, async (req, res) => {
  try {
    const { category, subcategory, color_primary, material, style, purchase_price, seasons, occasions, image_url } = req.body;
    const result = await pool.query(
      `UPDATE wardrobe_items SET category = $1, subcategory = $2, color_primary = $3, material = $4, style = $5, purchase_price = $6, seasons = $7, occasions = $8, image_url = $9
       WHERE id = $10 AND user_id = $11 RETURNING *`,
      [category, subcategory, color_primary, material, style, purchase_price || 0, seasons, occasions, image_url, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Ошибка" }); }
});
  
app.delete("/wardrobe/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query(`DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id]);
    res.json({ message: "Удалено" });
  } catch (error) { res.status(500).json({ error: "Ошибка" }); }
});

app.put("/api/user/preferences", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE users SET style_preferences = $1 WHERE id = $2 RETURNING *`, [req.body.preferences, req.user.id]);
    res.json({ user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Ошибка" }); }
});

app.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Server on ${PORT}`); });