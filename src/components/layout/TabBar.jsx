import { IconHome, IconHeart, IconHanger, IconUser } from "../ui/Icons.jsx";

const TABS = [
  { id: "home", label: "Главная", Icon: IconHome },
  { id: "favorites", label: "Избранное", Icon: IconHeart },
  { id: "wardrobe", label: "Гардероб", Icon: IconHanger },
  { id: "profile", label: "Профиль", Icon: IconUser },
];

export default function TabBar({ activeTab, onChange }) {
  return (
    <nav className="tabbar" aria-label="Основная навигация">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`tab${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} filled={isActive} />
            <span className="tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
