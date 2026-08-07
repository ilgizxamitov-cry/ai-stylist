import { Badge, IconButton } from "../ui/index.jsx";
import { IconHanger, IconPencil, IconTrash } from "../ui/Icons.jsx";

// Мягкие пастельные подложки — чтобы масонри-сетка не выглядела монотонной
const TINTS = [
  "linear-gradient(135deg, #fdf1f3 0%, #f7e6ea 100%)",
  "linear-gradient(135deg, #eef3fb 0%, #e3ebf7 100%)",
  "linear-gradient(135deg, #f1f7f0 0%, #e5f0e6 100%)",
  "linear-gradient(135deg, #fbf5ea 0%, #f4ecdc 100%)",
];

const RATIOS = ["3 / 4", "1 / 1", "4 / 5"];

const hash = (value) =>
  String(value)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function ItemPin({ item, onEdit, onDelete }) {
  const seed = hash(item.id ?? item.subcategory ?? "0");
  const tint = TINTS[seed % TINTS.length];
  const ratio = RATIOS[seed % RATIOS.length];
  const price = Number(item.purchase_price) || 0;
  const worn = Number(item.times_worn) || 0;
  const cpw = worn > 0 ? Math.round(price / worn) : null;

  return (
    <article className="masonry-item pin">
      <div className="pin-media">
        {item.image_url ? (
          <div
            className="media-contain"
            style={{ background: tint, aspectRatio: ratio }}
          >
            <img
              src={item.image_url || "/placeholder.svg"}
              alt={item.subcategory || item.category}
              style={{ maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        ) : (
          <div className="pin-placeholder" style={{ background: tint, aspectRatio: ratio }}>
            <IconHanger size={34} strokeWidth={1.4} />
          </div>
        )}

        <Badge float>{item.category}</Badge>

        <div className="pin-actions">
          <IconButton
            label="Редактировать"
            variant="solid"
            icon={<IconPencil size={16} />}
            onClick={() => onEdit(item)}
          />
          <IconButton
            label="Удалить"
            variant="solid"
            className="icon-btn-danger"
            icon={<IconTrash size={16} />}
            onClick={() => onDelete(item.id)}
          />
        </div>
      </div>

      <div className="stack gap-1">
        <span className="pin-title">{item.subcategory || item.category}</span>
        <span className="pin-meta">
          {[item.color_primary, item.material].filter(Boolean).join(" · ")}
        </span>
        <div className="row gap-2 wrap">
          <span className="badge">{price.toLocaleString("ru-RU")} ₽</span>
          {cpw !== null && (
            <span className="badge badge-success">CPW {cpw.toLocaleString("ru-RU")} ₽</span>
          )}
        </div>
      </div>
    </article>
  );
}
