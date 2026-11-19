// Фирменные цвета Connected (как у Konnektik и в ConnectedStore).
// Фон и текст берутся из темы Telegram (светлая / тёмная), а кнопки, ссылки и акценты — фирменные.
//
// Белый текст на #50C878 читается плохо (контраст ~2.3:1), поэтому на зелёных кнопках —
// тёмный текст, а ссылки и зелёный текст на светлом фоне — тёмно-зелёные.

export const BRAND = {
  accent: '#50C878',
  accentPressed: '#45B96B',
  onAccent: '#14261B',       // текст на зелёной кнопке
  inkLight: '#1D7A46',       // зелёный текст и ссылки на светлом фоне
  inkDark: '#6FDC95',        // зелёный текст и ссылки на тёмном фоне
  softLight: '#E9F7EF',      // мягкая зелёная подложка
  softDark: 'rgba(80, 200, 120, 0.16)',
  dark: '#2B2A29',
  warn: '#FF9500',
  danger: '#FF3B30',
};

/** Применить фирменные цвета поверх темы Telegram. Вызывать после установки цветов темы. */
export function applyBrand(isDark: boolean) {
  const root = document.documentElement;
  const ink = isDark ? BRAND.inkDark : BRAND.inkLight;
  const vars: Record<string, string> = {
    '--tg-theme-button-color': BRAND.accent,
    '--tg-theme-button-text-color': BRAND.onAccent,
    '--tg-theme-link-color': ink,
    '--tgui--button_color': BRAND.accent,
    '--tgui--button_text_color': BRAND.onAccent,
    '--tgui--link_color': ink,
    '--tgui--accent_text_color': ink,
    '--brand-accent': BRAND.accent,
    '--brand-ink': ink,
    '--brand-soft': isDark ? BRAND.softDark : BRAND.softLight,
    '--brand-on-accent': BRAND.onAccent,
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  const tg = (window as any).Telegram?.WebApp;
  try {
    tg?.MainButton?.setParams?.({ color: BRAND.accent, text_color: BRAND.onAccent });
  } catch { /* старые клиенты Telegram */ }
}
