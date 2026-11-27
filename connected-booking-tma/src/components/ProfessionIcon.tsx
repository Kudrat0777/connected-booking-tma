// Фирменные иконки профессий: тонкая линия цвета текста и одна зелёная точка, как в логотипе Connected.
// Вместо эмодзи (✂️, 🏠) во всём приложении.
import React from 'react';
import type { Profession } from '../helpers/professions';

type Dot = [number, number, number]; // cx, cy, r
type Glyph = { d: string[]; dots: Dot[] };

export const GLYPHS: Record<Profession | 'solo' | 'team', Glyph> = {
  barber: { d: ['M8 10h8v9a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z', 'M7.5 10V6h9v4', 'M9 6V3.5M12 6V3.5M15 6V3.5'], dots: [[12, 15.5, 1.7]] },
  hair: { d: ['M3.5 9.5A5.5 5.5 0 0 1 9 4h5.5l6 2.5v6L14.5 15H9a5.5 5.5 0 0 1-5.5-5.5z', 'M9 15l1.6 6h3.2L12.5 15'], dots: [[9, 9.5, 2.1]] },
  nails: { d: ['M10 2.5h4V8h-4z', 'M7 11.5A3.5 3.5 0 0 1 10.5 8h3a3.5 3.5 0 0 1 3.5 3.5v7a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 1 7 18.5z'], dots: [[12, 15, 2.2]] },
  brows: { d: ['M2.5 13S6 7.5 12 7.5 21.5 13 21.5 13 18 18.5 12 18.5 2.5 13 2.5 13z', 'M6.5 8.5 5 6.2M12 7.5V4.8M17.5 8.5 19 6.2'], dots: [[12, 13, 2.6]] },
  massage: { d: ['M5.5 21h13a3 3 0 0 0 0-6h-13a3 3 0 0 0 0 6z', 'M7.5 15a4.5 3.2 0 0 1 9 0'], dots: [[12, 8.2, 2.5]] },
  yoga: { d: ['M12 8.5v5.5', 'M5.5 10.5 12 12.5l6.5-2', 'M4.5 19.5c3.5-3 11.5-3 15 0', 'M8 17.2l4 1.3 4-1.3'], dots: [[12, 5, 2.3]] },
  fitness: { d: ['M8.5 9.5V7.5a3.5 3.5 0 0 1 7 0v2', 'M5.5 15a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z'], dots: [[12, 15, 1.9]] },
  dance: { d: ['M12.5 8 10 13.5l3.5 3-1 5', 'M10 13.5 5 14.5', 'M12 9.5l6-1.5', 'M13.5 16.5 17 19'], dots: [[14, 4.5, 2.2]] },
  tutor: { d: ['M3 6.5c3-1.2 6-1 9 1V20c-3-2-6-2.2-9-1z', 'M21 6.5c-3-1.2-6-1-9 1V20c3-2 6-2.2 9-1z'], dots: [[12, 3.6, 1.6]] },
  doctor: { d: ['M6 3v6a5 5 0 0 0 10 0V3', 'M4.5 3h3M14.5 3h3', 'M11 14v2.5a4 4 0 0 0 8 0V15'], dots: [[19, 12.8, 2.2]] },
  psych: { d: ['M4 4.5h10.5a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H9l-4 3.2V14H4a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z', 'M19 9h1a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-1v2.8L16 17.5h-3.5'], dots: [[9.2, 9.2, 1.8]] },
  auto: { d: ['M4.5 16v-4l2-5.5h11l2 5.5v4', 'M3 16h18v3.5H3z', 'M6 19.5v2M18 19.5v2'], dots: [[7.5, 13.6, 1.4], [16.5, 13.6, 1.4]] },
  photo: { d: ['M4 8h3l1.8-3h6.4L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M8 13.5a4 4 0 1 0 8 0 4 4 0 0 0-8 0z'], dots: [[12, 13.5, 1.9]] },
  other: { d: ['M17.2 7.2a6.8 6.8 0 1 0 0 9.6'], dots: [[19, 12, 2.4]] },
  solo: { d: ['M12 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6z', 'M4.5 21a7.5 7.5 0 0 1 15 0'], dots: [[19, 5, 2.2]] },
  team: {
    d: ['M7 21a5 5 0 0 1 10 0', 'M1.8 19a4 4 0 0 1 5.2-3.6', 'M22.2 19a4 4 0 0 0-5.2-3.6',
      'M5.5 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M18.5 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z'],
    dots: [[12, 9, 3]],
  },
};

/** Только рисунок, цвет линии — текущий цвет текста (тема Telegram) */
export const ProfessionGlyph: React.FC<{ name: keyof typeof GLYPHS; size?: number; strokeWidth?: number }> = ({ name, size = 26, strokeWidth = 1.7 }) => {
  const g = GLYPHS[name] ?? GLYPHS.other;
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {g.d.map((d) => <path key={d} d={d} />)}
      {g.dots.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="var(--brand-accent, #50C878)" stroke="none" />)}
    </svg>
  );
};

/** Иконка в скруглённой плашке */
export const ProfessionIcon: React.FC<{ name: keyof typeof GLYPHS; size?: number; tile?: number }> = ({ name, size = 26, tile = 40 }) => (
  <span aria-hidden="true" style={{
    width: tile, height: tile, borderRadius: Math.round(tile * 0.3), flex: '0 0 auto', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127,127,127,0.14)', color: 'var(--tg-theme-text-color)',
  }}>
    <ProfessionGlyph name={name} size={size} />
  </span>
);
