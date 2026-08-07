import { IconSparkle } from "../ui/Icons.jsx";

export default function TopBar({ title, right }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="logo-mark" aria-hidden="true">
          <IconSparkle size={16} strokeWidth={2} />
        </span>
        {title}
      </div>
      {right}
    </header>
  );
}
