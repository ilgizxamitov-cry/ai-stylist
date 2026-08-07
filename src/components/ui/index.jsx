import { IconClose } from "./Icons.jsx";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  icon = null,
  children,
  className,
  disabled,
  ...rest
}) {
  return (
    <button
      className={cx(
        "btn",
        `btn-${variant}`,
        size !== "md" && `btn-${size}`,
        block && "btn-block",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className={cx(
            "spinner",
            (variant === "primary" || variant === "gradient") &&
              "spinner-on-accent"
          )}
          style={{ width: 18, height: 18, borderWidth: 2 }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ---------------- IconButton ---------------- */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  className,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("icon-btn", variant !== "ghost" && `icon-btn-${variant}`, className)}
      {...rest}
    >
      {icon}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ pad = true, accent = false, className, children, ...rest }) {
  return (
    <div
      className={cx("card", pad && "card-pad", accent && "card-accent", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Field / Input / Select ---------------- */
export function Field({ label, hint, children }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="text-xs text-tertiary">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cx("input", className)} {...rest} />;
}

export function Select({ options = [], className, ...rest }) {
  return (
    <select className={cx("select", className)} {...rest}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

/* ---------------- Chip ---------------- */
export function Chip({ selected = false, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx("chip", selected && "is-selected", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ tone = "neutral", float = false, children, className }) {
  return (
    <span
      className={cx(
        "badge",
        tone !== "neutral" && `badge-${tone}`,
        float && "badge-float",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Spinner + loading state ---------------- */
export function Spinner({ size = "md", onAccent = false }) {
  return (
    <span
      className={cx(
        "spinner",
        size === "lg" && "spinner-lg",
        onAccent && "spinner-on-accent"
      )}
      role="status"
      aria-label="Загрузка"
    />
  );
}

export function LoadingState({ text, onAccent = false }) {
  return (
    <div className="loading-state">
      <Spinner size="lg" onAccent={onAccent} />
      <span className="text-sm text-semibold" style={{ color: "inherit" }}>
        {text}
      </span>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && (
        <p className="text-sm text-secondary text-pretty" style={{ maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ onClose, children, labelledBy }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton
          label="Закрыть"
          className="modal-close"
          icon={<IconClose size={20} />}
          onClick={onClose}
        />
        {children}
      </div>
    </div>
  );
}

/* ---------------- Section header ---------------- */
export function SectionHead({ title, action }) {
  return (
    <div className="section-head">
      <h3 className="section-title">{title}</h3>
      {action}
    </div>
  );
}
