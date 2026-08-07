// Словари для стандартизации базы гардероба
export const CATEGORIES = [
  "Верх",
  "Низ",
  "Обувь",
  "Верхняя одежда",
  "Аксессуары",
  "Сумка",
];

export const COLORS = [
  "Черный",
  "Белый",
  "Серый",
  "Бежевый",
  "Синий",
  "Голубой",
  "Красный",
  "Зеленый",
  "Коричневый",
  "Желтый",
  "Розовый",
  "Разноцветный",
];

export const MATERIALS = [
  "Хлопок",
  "Деним",
  "Шерсть",
  "Кожа",
  "Лен",
  "Синтетика",
  "Шелк",
  "Трикотаж",
  "Смесовая ткань",
  "Неизвестно",
];

export const SEASONS = ["Лето", "Зима", "Демисезон", "Мультисезон"];

export const initialItemState = {
  category: "Верх",
  subcategory: "",
  color_primary: "Черный",
  material: "Хлопок",
  style: "Casual",
  price: "",
  seasons: "Мультисезон",
  occasions: "",
  image_url: null,
};

export const STYLE_OPTIONS = [
  {
    id: "old_money",
    name: "Old Money / Классика",
    img: "https://images.unsplash.com/photo-1600091166971-7f9faad6c1e2?w=400&q=80",
  },
  {
    id: "streetwear",
    name: "Уличный стиль",
    img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&q=80",
  },
  {
    id: "smart_casual",
    name: "Smart Casual",
    img: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&q=80",
  },
  {
    id: "minimalism",
    name: "Минимализм",
    img: "https://images.unsplash.com/photo-1434389678869-be40b3e92ed5?w=400&q=80",
  },
];
