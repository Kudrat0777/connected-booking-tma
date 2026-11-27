// Фирменные иконки интерфейса (профиль, настройки): тонкая линия цвета текста и зелёная точка,
// как у иконок профессий. Вместо эмодзи ✏️ 🔗 🗓 👥 📊 ⭐ 🌐 👤 🚪 🗑.
import React from 'react';

type Glyph = { d: string[]; dot?: [number, number, number] };

const GLYPHS = {
  edit: { d: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'] },
  share: { d: ['M12 15V4', 'M8 8l4-4 4 4', 'M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'] },
  calendar: { d: ['M4 6.5h16v13H4z', 'M4 10.5h16M8.5 4v4M15.5 4v4'], dot: [12, 15, 1.7] },
  clock: { d: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'], dot: [19, 5, 2] },
  qr: { d: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 20h6M20 14v3'], dot: [16, 16, 2] },
  sun: {
    d: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
      'M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4'],
    dot: [12, 12, 2],
  },
  team: {
    d: ['M7 21a5 5 0 0 1 10 0', 'M1.8 19a4 4 0 0 1 5.2-3.6', 'M22.2 19a4 4 0 0 0-5.2-3.6',
      'M5.5 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M18.5 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z'],
    dot: [12, 9, 3],
  },
  clients: { d: ['M7 21a5 5 0 0 1 10 0', 'M12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'], dot: [18.5, 6, 2] },
  stats: { d: ['M5 20V11M12 20V5M19 20v-7'], dot: [19, 9.5, 1.8] },
  salon: { d: ['M4 6.5h16v13H4z', 'M4 10.5h16', 'M9.5 10.5v9M14.5 10.5v9'], dot: [12, 4, 1.8] },
  star: { d: ['M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z'], dot: [12, 11.6, 1.7] },
  globe: { d: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'], dot: [18.4, 5.6, 1.8] },
  eye: { d: ['M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z'], dot: [12, 12, 2.4] },
  logout: { d: ['M10 4H5v16h5', 'M14 8l4 4-4 4', 'M18 12H9'] },
  trash: { d: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'] },
  chevron: { d: ['M9 5l7 7-7 7'] },
  search: { d: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'] },
  pin: { d: ['M12 21s7-7.2 7-12.5A7 7 0 0 0 5 8.5C5 13.8 12 21 12 21z'], dot: [12, 8.7, 2.4] },
  locate: { d: ['M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M12 2v3M12 19v3M2 12h3M19 12h3'], dot: [12, 12, 2.4] },
  camera: { d: ['M4 8h3l1.8-3h6.4L17 8h3v11H4z', 'M9 13.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0z'] },
  plus: { d: ['M12 5v14M5 12h14'] },
} satisfies Record<string, Glyph>;

export type BrandIconName = keyof typeof GLYPHS;

export const BrandIcon: React.FC<{ name: BrandIconName; size?: number; strokeWidth?: number; color?: string }> = ({
  name, size = 22, strokeWidth = 1.7, color = 'currentColor',
}) => {
  const g: Glyph = GLYPHS[name];
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {g.d.map((d) => <path key={d} d={d} />)}
      {g.dot && <circle cx={g.dot[0]} cy={g.dot[1]} r={g.dot[2]} fill="var(--brand-accent, #50C878)" stroke="none" />}
    </svg>
  );
};
