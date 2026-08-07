import { useMemo, useState } from "react";
import { Button, Chip, EmptyState, Modal, SectionHead } from "../ui/index.jsx";
import { IconHanger, IconPlus } from "../ui/Icons.jsx";
import ItemForm from "../wardrobe/ItemForm.jsx";
import ItemPin from "../wardrobe/ItemPin.jsx";
import { CATEGORIES } from "../../lib/constants.js";

export default function WardrobeScreen({
  wardrobe,
  isFormOpen,
  onOpenForm,
  onCloseForm,
  formProps,
  onEditItem,
  onDeleteItem,
}) {
  const [filter, setFilter] = useState("Все");

  const filtered = useMemo(
    () => (filter === "Все" ? wardrobe : wardrobe.filter((i) => i.category === filter)),
    [wardrobe, filter]
  );

  const totalValue = useMemo(
    () => wardrobe.reduce((sum, i) => sum + (Number(i.purchase_price) || 0), 0),
    [wardrobe]
  );

  return (
    <div className="container-wide stack gap-5">
      <SectionHead
        title={`Гардероб · ${wardrobe.length}`}
        action={
          <Button size="sm" variant="primary" icon={<IconPlus size={16} />} onClick={onOpenForm}>
            Добавить
          </Button>
        }
      />

      {wardrobe.length > 0 && (
        <>
          <p className="text-sm text-secondary">
            Общая стоимость: {totalValue.toLocaleString("ru-RU")} ₽
          </p>

          <div className="row gap-2 wrap no-scrollbar" role="group" aria-label="Фильтр по категории">
            {["Все", ...CATEGORIES].map((category) => (
              <Chip
                key={category}
                selected={filter === category}
                onClick={() => setFilter(category)}
              >
                {category}
              </Chip>
            ))}
          </div>
        </>
      )}

      {wardrobe.length === 0 ? (
        <EmptyState
          icon={<IconHanger size={30} />}
          title="Шкаф пока пуст"
          description="Отсканируйте вещь по фото или просто расскажите голосом, что у вас есть — ИИ заполнит карточку сам."
          action={
            <Button variant="primary" icon={<IconPlus size={16} />} onClick={onOpenForm}>
              Добавить первую вещь
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="В этой категории пока нет вещей" />
      ) : (
        <div className="masonry">
          {filtered.map((item) => (
            <ItemPin key={item.id} item={item} onEdit={onEditItem} onDelete={onDeleteItem} />
          ))}
        </div>
      )}

      {isFormOpen && (
        <Modal onClose={onCloseForm} labelledBy="item-form-title">
          <ItemForm {...formProps} />
        </Modal>
      )}
    </div>
  );
}
