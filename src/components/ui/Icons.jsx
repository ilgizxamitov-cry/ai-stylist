/**
 * Иконки дизайн-системы: тонкая линия в духе Instagram.
 * Единый API: <IconHome size={24} strokeWidth={1.8} />
 */

const base = (size, strokeWidth) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
});

export function IconHome({ size = 24, strokeWidth = 1.8, filled = false }) {
  return (
    <svg {...base(size, strokeWidth)} fill={filled ? "currentColor" : "none"}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function IconHeart({ size = 24, strokeWidth = 1.8, filled = false }) {
  return (
    <svg {...base(size, strokeWidth)} fill={filled ? "currentColor" : "none"}>
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.1 8.1a1 1 0 0 0 1.4 0l8.1-8.1a5 5 0 0 0 0-7.1z" />
    </svg>
  );
}

export function IconHanger({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 8a2.5 2.5 0 1 1 2.5-2.5" />
      <path d="M12 8v1.8L3.6 15a1.5 1.5 0 0 0 .8 2.8h15.2a1.5 1.5 0 0 0 .8-2.8L12 9.8" />
    </svg>
  );
}

export function IconUser({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function IconSparkle({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M18 16.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  );
}

export function IconCamera({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.3a1 1 0 0 0 .8-.4l1-1.3a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.3a1 1 0 0 0 .8.4h1.3A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function IconMic({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </svg>
  );
}

export function IconPencil({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="M14.5 5.5l3 3" />
    </svg>
  );
}

export function IconTrash({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconClose({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck({ size = 24, strokeWidth = 2.2 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconRefresh({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M20 11a8 8 0 1 0-2.3 6.3" />
      <path d="M20 4.5V11h-6" />
    </svg>
  );
}

export function IconBriefcase({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function IconDisco({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 6V3M5.5 9.5h13M6.5 17h11M12 6v14" />
    </svg>
  );
}

export function IconShoe({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M2.5 16.5v-5l4 1 3-3 2.5 3.5c1.6.6 5.2 1 7 1.5 1.7.5 2.5 1.2 2.5 2h-19z" />
      <path d="M6.5 12.5l1-2" />
    </svg>
  );
}

export function IconGlass({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6 4h12l-6 7z" />
      <path d="M12 11v7M8.5 21h7" />
    </svg>
  );
}

export function IconBody({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M12 7.5v6M7 10l5-1.5 5 1.5M9.5 21l2.5-7.5 2.5 7.5" />
    </svg>
  );
}

export function IconLogout({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M17 8.5l3.5 3.5L17 15.5M20.5 12H10" />
    </svg>
  );
}

export function IconTag({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M11.6 3.5H20a.5.5 0 0 1 .5.5v8.4a1 1 0 0 1-.3.7l-7.4 7.4a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1 0-1.4l7.5-7.4a1 1 0 0 1 .7-.2z" />
      <circle cx="16" cy="8" r="1.4" />
    </svg>
  );
}

export function IconPlus({ size = 24, strokeWidth = 2 }) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
