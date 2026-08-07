import { Button, EmptyState } from "../ui/index.jsx";
import { IconHeart, IconSparkle } from "../ui/Icons.jsx";

export default function FavoritesScreen({ token, favorites, onGoToLogin, onGoHome }) {
  if (!token) {
    return (
      <div className="container">
        <EmptyState
          icon={<IconHeart size={30} />}
          title="Нужен профиль"
          description="Войдите, чтобы сохранять понравившиеся образы в избранное."
          action={
            <Button variant="primary" onClick={onGoToLogin}>
              Перейти ко входу
            </Button>
          }
        />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container">
        <EmptyState
          icon={<IconHeart size={30} />}
          title="Пока ничего не сохранено"
          description="Сгенерируйте образ на главной и добавьте его в избранное, чтобы вернуться к нему позже."
          action={
            <Button variant="primary" icon={<IconSparkle size={16} />} onClick={onGoHome}>
              Собрать образ
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-wide">
      <div className="masonry">
        {favorites.map((look) => (
          <article key={look.id} className="masonry-item pin">
            <div className="pin-media">
              {look.image_url ? (
                <img src={look.image_url || "/placeholder.svg"} alt={look.title || "Образ"} />
              ) : (
                <div className="pin-placeholder">
                  <IconSparkle size={30} strokeWidth={1.4} />
                </div>
              )}
            </div>
            <span className="pin-title">{look.title || "Образ от ИИ"}</span>
            {look.occasion && <span className="pin-meta">{look.occasion}</span>}
          </article>
        ))}
      </div>
    </div>
  );
}
