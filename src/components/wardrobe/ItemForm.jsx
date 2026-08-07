import { Button, Field, IconButton, Input, Select, Spinner } from "../ui/index.jsx";
import { IconCamera, IconMic } from "../ui/Icons.jsx";
import { CATEGORIES, COLORS, MATERIALS, SEASONS } from "../../lib/constants.js";

export default function ItemForm({
  item,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  loading,
  photoInputRef,
  onPhotoSelect,
  isScanning,
  isListening,
  onVoiceAdd,
}) {
  const set = (key) => (event) => onChange({ ...item, [key]: event.target.value });

  return (
    <form onSubmit={onSubmit} className="stack gap-4">
      <div className="row-between gap-3">
        <h3 id="item-form-title">{isEditing ? "Редактировать вещь" : "Новая вещь"}</h3>
      </div>

      {/* Быстрое добавление: фото или голос */}
      <div className="row gap-2">
        <input
          type="file"
          accept="image/*"
          ref={photoInputRef}
          onChange={onPhotoSelect}
          className="sr-only"
          aria-label="Фото вещи"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="grow"
          loading={isScanning}
          disabled={isListening}
          icon={<IconCamera size={16} />}
          onClick={() => photoInputRef.current?.click()}
        >
          {isScanning ? "Распознаю…" : "Скан по фото"}
        </Button>
        <IconButton
          label={isListening ? "Остановить запись" : "Добавить голосом"}
          className={isListening ? "is-recording" : ""}
          variant="solid"
          disabled={isScanning}
          icon={isListening ? <Spinner /> : <IconMic size={18} />}
          onClick={onVoiceAdd}
        />
      </div>

      {item.image_url && (
        <div className="media media-contain" style={{ height: 160 }}>
          <img src={item.image_url || "/placeholder.svg"} alt="Фото вещи без фона" />
        </div>
      )}

      <Field label="Категория">
        <Select value={item.category} onChange={set("category")} options={CATEGORIES} required />
      </Field>

      <Field label="Что это?">
        <Input
          placeholder="Худи, джинсы, кроссовки…"
          value={item.subcategory}
          onChange={set("subcategory")}
          required
        />
      </Field>

      <div className="row gap-3 wrap">
        <div className="grow" style={{ minWidth: 140 }}>
          <Field label="Цвет">
            <Select value={item.color_primary} onChange={set("color_primary")} options={COLORS} required />
          </Field>
        </div>
        <div className="grow" style={{ minWidth: 140 }}>
          <Field label="Материал">
            <Select value={item.material} onChange={set("material")} options={MATERIALS} />
          </Field>
        </div>
      </div>

      <div className="row gap-3 wrap">
        <div className="grow" style={{ minWidth: 140 }}>
          <Field label="Цена, ₽" hint="Нужна для расчёта CPW">
            <Input type="number" min="0" placeholder="4990" value={item.price} onChange={set("price")} required />
          </Field>
        </div>
        <div className="grow" style={{ minWidth: 140 }}>
          <Field label="Сезон">
            <Select value={item.seasons} onChange={set("seasons")} options={SEASONS} />
          </Field>
        </div>
      </div>

      <div className="row gap-2">
        {isEditing && (
          <Button type="button" variant="secondary" className="grow" onClick={onCancel}>
            Отмена
          </Button>
        )}
        <Button type="submit" variant="primary" className="grow" loading={loading}>
          {isEditing ? "Сохранить" : "В гардероб"}
        </Button>
      </div>
    </form>
  );
}
