import {
  Button,
  Card,
  LoadingState,
  SectionHead,
} from "../ui/index.jsx";
import {
  IconBody,
  IconCamera,
  IconCheck,
  IconLogout,
  IconRefresh,
  IconSparkle,
  IconUser,
} from "../ui/Icons.jsx";
import { STYLE_OPTIONS } from "../../lib/constants.js";

export default function ProfileScreen({
  token,
  user,
  wardrobeCount,
  preferences,
  onToggleStyle,
  onSavePreferences,
  isSavingPrefs,
  personPhotoRef,
  personPhoto,
  onPersonPhotoSelect,
  onAnalyzePerson,
  onResetPersonPhoto,
  isAnalyzingPerson,
  personAnalysis,
  onLogout,
}) {
  if (!token) {
    return (
      <div className="container stack gap-5">
        <Card className="stack gap-4" style={{ textAlign: "center" }}>
          <span className="empty-icon" style={{ margin: "0 auto" }}>
            <IconUser size={30} />
          </span>
          <div className="stack gap-1">
            <h3>Войдите в профиль</h3>
            <p className="text-sm text-secondary text-pretty">
              Сохраняйте вещи, образы и результаты анализа стиля на всех устройствах.
            </p>
          </div>
          <div id="googleSignInDiv" className="center" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container stack gap-5">
      {/* Шапка профиля */}
      <div className="row gap-4">
        {user?.picture ? (
          <span className="avatar avatar-lg avatar-ring">
            <img
              src={user.picture || "/placeholder.svg"}
              alt=""
              className="avatar"
              style={{ width: "100%", height: "100%" }}
            />
          </span>
        ) : (
          <span className="empty-icon">
            <IconUser size={28} />
          </span>
        )}
        <div className="stack gap-1 grow">
          <h2 style={{ fontSize: "var(--text-xl)" }}>{user?.name || "Профиль"}</h2>
          <span className="text-sm text-secondary">{user?.email}</span>
          <div className="row gap-2">
            <span className="badge">{wardrobeCount} вещей</span>
            {user?.tier && <span className="badge badge-accent">{user.tier}</span>}
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Style ID */}
      <section className="stack gap-3">
        <SectionHead title="Мой Style ID" />
        <Card accent className="stack gap-4">
          <div className="card-header">
            <span className="tile-icon">
              <IconBody size={20} />
            </span>
            <div className="stack">
              <span className="text-semibold">Цветотип и тип фигуры</span>
              <span className="text-xs text-secondary">Анализ по фото во весь рост</span>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={personPhotoRef}
            onChange={onPersonPhotoSelect}
            className="sr-only"
            aria-label="Фото фигуры"
          />

          {!personPhoto && !user?.style_analysis && (
            <div className="stack gap-3">
              <p className="text-sm text-secondary text-relaxed">
                Загрузите фото во весь рост при дневном свете и в облегающей одежде — ИИ
                определит ваши идеальные цвета и фасоны.
              </p>
              <Button
                variant="primary"
                block
                icon={<IconCamera size={18} />}
                onClick={() => personPhotoRef.current?.click()}
              >
                Загрузить фото фигуры
              </Button>
            </div>
          )}

          {!personPhoto && user?.style_analysis && (
            <div className="stack gap-3 animate-fade-in">
              {user?.vton_image && (
                <div className="media media-tall">
                  <img src={user.vton_image || "/placeholder.svg"} alt="Моё фото для примерок" />
                </div>
              )}
              <div className="prose prose-panel">{user.style_analysis}</div>
              <Button
                variant="secondary"
                block
                icon={<IconRefresh size={18} />}
                onClick={() => personPhotoRef.current?.click()}
              >
                Обновить фото и Style ID
              </Button>
            </div>
          )}

          {personPhoto && (
            <div className="stack gap-3">
              <div className="media media-tall">
                <img src={personPhoto || "/placeholder.svg"} alt="Превью фото фигуры" />
              </div>

              {!isAnalyzingPerson && !personAnalysis && (
                <div className="row gap-2">
                  <Button variant="secondary" className="grow" onClick={onResetPersonPhoto}>
                    Отмена
                  </Button>
                  <Button
                    variant="primary"
                    className="grow"
                    icon={<IconSparkle size={16} />}
                    onClick={onAnalyzePerson}
                  >
                    Отправить ИИ
                  </Button>
                </div>
              )}

              {isAnalyzingPerson && (
                <LoadingState text="ИИ снимает мерки и подбирает палитру…" />
              )}

              {personAnalysis && !isAnalyzingPerson && (
                <div className="stack gap-3 animate-fade-in">
                  <div className="prose prose-panel">{personAnalysis}</div>
                  <Button variant="secondary" block onClick={onResetPersonPhoto}>
                    Закрыть превью
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Предпочтения по стилю */}
      <section className="stack gap-3">
        <SectionHead title="Любимые стили" />
        <div className="grid-auto">
          {STYLE_OPTIONS.map((option) => {
            const selected = preferences.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                className={`style-card${selected ? " is-selected" : ""}`}
                onClick={() => onToggleStyle(option.id)}
              >
                <img src={option.img || "/placeholder.svg"} alt={option.name} />
                {selected && (
                  <span className="style-card-check">
                    <IconCheck size={14} />
                  </span>
                )}
                <span className="style-card-label">{option.name}</span>
              </button>
            );
          })}
        </div>
        <Button variant="primary" block loading={isSavingPrefs} onClick={onSavePreferences}>
          Сохранить предпочтения
        </Button>
      </section>

      <hr className="divider" />

      <Button variant="danger" block icon={<IconLogout size={18} />} onClick={onLogout}>
        Выйти из аккаунта
      </Button>
    </div>
  );
}
