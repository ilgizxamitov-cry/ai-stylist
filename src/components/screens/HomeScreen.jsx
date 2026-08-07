import {
  Button,
  Card,
  LoadingState,
  Modal,
  SectionHead,
} from "../ui/index.jsx";
import {
  IconBriefcase,
  IconCamera,
  IconDisco,
  IconGlass,
  IconRefresh,
  IconShoe,
  IconSparkle,
} from "../ui/Icons.jsx";

const OCCASIONS = [
  {
    id: "work",
    label: "Работа",
    sub: "Офис и встречи",
    prompt: "Офис и деловая встреча",
    Icon: IconBriefcase,
  },
  {
    id: "party",
    label: "Вечеринка",
    sub: "Клуб и танцы",
    prompt: "Яркая вечеринка или клуб",
    Icon: IconDisco,
  },
  {
    id: "walk",
    label: "Прогулка",
    sub: "Город и комфорт",
    prompt: "Стильная и комфортная прогулка по городу",
    Icon: IconShoe,
  },
  {
    id: "event",
    label: "Мероприятие",
    sub: "Ресторан и театр",
    prompt: "Вечернее мероприятие, ресторан или театр",
    Icon: IconGlass,
  },
];

export default function HomeScreen({
  stories,
  activeStory,
  onOpenStory,
  onCloseStory,
  fileInputRef,
  uploadedLook,
  onFileSelect,
  onPickPhoto,
  onSendForAnalysis,
  onResetLook,
  isAnalyzing,
  aiVerdict,
  onGenerate,
  isGenerating,
  generatedOutfit,
  tryOnItem,
  onTryOn,
  isTryingOn,
  tryOnResult,
}) {
  const outfitText =
    typeof generatedOutfit === "string"
      ? generatedOutfit
      : generatedOutfit?.text || "";

  return (
    <div className="container stack gap-6">
      {/* Сторис-онбординг */}
      <section aria-label="Как это работает">
        <div className="stories no-scrollbar">
          {stories.map((story) => (
            <button
              key={story.id}
              type="button"
              className="story"
              onClick={() => onOpenStory(story)}
            >
              <span className="story-ring">
                <span className="story-inner">
                  <story.Icon size={26} strokeWidth={1.8} />
                </span>
              </span>
              <span className="story-label">{story.title}</span>
            </button>
          ))}
        </div>
      </section>

      {activeStory && (
        <Modal onClose={onCloseStory} labelledBy="story-title">
          <div className="stack gap-3 center" style={{ textAlign: "center" }}>
            <span className="empty-icon">
              <activeStory.Icon size={28} />
            </span>
            <h3 id="story-title">{activeStory.title}</h3>
            <p className="text-sm text-secondary text-relaxed text-pretty">
              {activeStory.text}
            </p>
            <Button variant="primary" block onClick={onCloseStory}>
              Понятно
            </Button>
          </div>
        </Modal>
      )}

      {/* Главный баннер: оценка образа */}
      <section className="hero">
        <div className="row gap-3">
          <span
            className="center"
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-circle)",
              background: "rgba(255,255,255,0.22)",
              flex: "none",
            }}
          >
            <IconSparkle size={22} strokeWidth={2} />
          </span>
          <div className="stack">
            <span className="hero-title">Оценить образ</span>
            <span className="hero-sub">Нейросеть разберёт ваш лук по деталям</span>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="sr-only"
          aria-label="Загрузить фото образа"
        />

        {!uploadedLook && (
          <Button
            variant="secondary"
            block
            className="full"
            style={{ marginTop: "var(--space-4)" }}
            icon={<IconCamera size={18} />}
            onClick={onPickPhoto}
          >
            Выбрать фото
          </Button>
        )}

        {uploadedLook && (
          <div className="hero-panel stack gap-3">
            <div className="media" style={{ maxHeight: 420 }}>
              <img src={uploadedLook || "/placeholder.svg"} alt="Загруженный образ" />
            </div>

            {!isAnalyzing && !aiVerdict && (
              <div className="row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="grow"
                  icon={<IconRefresh size={16} />}
                  onClick={onPickPhoto}
                >
                  Заменить
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="grow"
                  icon={<IconSparkle size={16} />}
                  onClick={onSendForAnalysis}
                >
                  Отправить ИИ
                </Button>
              </div>
            )}

            {isAnalyzing && (
              <div style={{ color: "var(--color-text-inverse)" }}>
                <LoadingState text="Стилист разбирает образ…" onAccent />
              </div>
            )}

            {aiVerdict && !isAnalyzing && (
              <div className="stack gap-3 animate-fade-in">
                <div className="prose prose-panel">{aiVerdict}</div>
                <Button variant="outline" block onClick={onResetLook}>
                  Разобрать другой образ
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Подбор образа по поводу */}
      <section>
        <SectionHead title="Подобрать образ" />
        <div className="grid-2">
          {OCCASIONS.map(({ id, label, sub, prompt, Icon }) => (
            <button
              key={id}
              type="button"
              className="tile"
              onClick={() => onGenerate(prompt)}
            >
              <span className="tile-icon">
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <span className="tile-label">{label}</span>
              <span className="tile-sub">{sub}</span>
            </button>
          ))}
        </div>
      </section>

      {(isGenerating || generatedOutfit) && (
        <Card accent className="animate-fade-in">
          {isGenerating ? (
            <LoadingState text="ИИ-стилист собирает капсулу…" />
          ) : (
            <div className="stack gap-4">
              <div className="row gap-2">
                <span className="badge badge-accent">
                  <IconSparkle size={12} strokeWidth={2.4} />
                  Образ от ИИ
                </span>
              </div>

              <div className="prose">{outfitText}</div>

              {tryOnItem && (
                <div className="stack gap-2">
                  <hr className="divider" />
                  <p className="text-sm text-secondary">
                    Хотите увидеть, как эта вещь сидит на вас?
                  </p>
                  <Button
                    variant="primary"
                    block
                    loading={isTryingOn}
                    onClick={() => onTryOn(tryOnItem.id)}
                  >
                    {isTryingOn ? "ИИ шьёт образ, 30–40 сек…" : "Примерить на себя"}
                  </Button>
                </div>
              )}

              {tryOnResult && (
                <div className="stack gap-2 animate-fade-in">
                  <span className="text-semibold">Готово! Вот как это выглядит</span>
                  <div className="media">
                    <img src={tryOnResult || "/placeholder.svg"} alt="Результат примерки" />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
