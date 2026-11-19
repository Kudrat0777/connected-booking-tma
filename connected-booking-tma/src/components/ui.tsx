// Общие элементы интерфейса клиента: одинаковые отступы, скругления и поведение на всех экранах.
import React, { useEffect, useState } from 'react';
import { useTunnelImage } from '../helpers/api';

export const RADIUS = 16;

export const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)',
  borderRadius: RADIUS,
  padding: 14,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
};

export const page: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
  minHeight: '100vh',
  color: 'var(--tg-theme-text-color)',
};

export const hint: React.CSSProperties = { color: 'var(--tg-theme-hint-color)' };

// Мягкие фоны для инициалов: цвет стабилен для одного имени
const AVATAR_TONES = ['#E9F7EF', '#E8F1FD', '#FDF1E7', '#F3ECFD', '#FDEBEE', '#E7F7F8'];
const AVATAR_INK = ['#1D7A46', '#1F5FAD', '#A35A13', '#6A3FB0', '#B0304A', '#1C7C80'];

function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % AVATAR_TONES.length;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '•';
}

/** Фото мастера, а если его нет или оно не загрузилось — цветные инициалы. */
export const Avatar: React.FC<{ src?: string | null; name: string; size?: number; radius?: number }> = ({
  src, name, size = 48, radius,
}) => {
  const url = useTunnelImage(src || undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const r = radius ?? size / 2;
  if (url && !failed) {
    return (
      <img src={url} alt="" onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flex: '0 0 auto', display: 'block' }} />
    );
  }
  const tone = toneFor(name);
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: r, flex: '0 0 auto', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, letterSpacing: 0.5,
      backgroundColor: AVATAR_TONES[tone], color: AVATAR_INK[tone],
    }}>
      {initials(name)}
    </div>
  );
};

/** onCard — чип лежит на белой карточке: неактивный тогда серый, иначе сливается с фоном. */
export const Chip: React.FC<{ active?: boolean; onClick?: () => void; onCard?: boolean; children: React.ReactNode }> = ({ active, onClick, onCard, children }) => (
  <button type="button" onClick={onClick} aria-pressed={!!active} style={{
    flex: '0 0 auto', padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
    backgroundColor: active ? 'var(--brand-accent, #50C878)' : onCard ? 'var(--tg-theme-secondary-bg-color)' : 'var(--tg-theme-bg-color)',
    color: active ? 'var(--brand-on-accent, #14261B)' : 'var(--tg-theme-text-color)',
    boxShadow: active || onCard ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
  }}>
    {children}
  </button>
);

/** Крупная фирменная кнопка: работает и в браузере, и в Telegram (не зависит от MainButton). */
export const PrimaryButton: React.FC<{
  onClick?: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode; variant?: 'primary' | 'soft' | 'danger';
}> = ({ onClick, disabled, loading, children, variant = 'primary' }) => {
  const styles = {
    primary: { bg: 'var(--brand-accent, #50C878)', fg: 'var(--brand-on-accent, #14261B)' },
    soft: { bg: 'var(--brand-soft, #E9F7EF)', fg: 'var(--brand-ink, #1D7A46)' },
    danger: { bg: 'rgba(255, 59, 48, 0.1)', fg: '#FF3B30' },
  }[variant];
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} style={{
      width: '100%', minHeight: 50, padding: '0 16px', borderRadius: 14, border: 'none', fontFamily: 'inherit',
      fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      backgroundColor: styles.bg, color: styles.fg, opacity: disabled ? 0.45 : 1, transition: 'opacity .15s',
    }}>
      {loading ? '…' : children}
    </button>
  );
};

/** Панель снизу экрана (подтверждение, выбор). Закрывается по тапу на фон. */
export const Sheet: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.35)' }} />
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '88vh', overflowY: 'auto',
      backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: '22px 22px 0 0', padding: '10px 16px 28px',
      boxShadow: '0 -8px 30px rgba(0,0,0,0.15)', color: 'var(--tg-theme-text-color)',
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.35, margin: '0 auto 14px' }} />
      {children}
    </div>
  </>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '18px 4px 10px' }}>
    <div style={{ fontSize: 18, fontWeight: 700 }}>{children}</div>
    {action}
  </div>
);

export const Badge: React.FC<{ tone: 'ok' | 'wait' | 'off' | 'brand'; children: React.ReactNode }> = ({ tone, children }) => {
  const c = {
    ok: { bg: 'rgba(80, 200, 120, 0.16)', fg: 'var(--brand-ink, #1D7A46)' },
    wait: { bg: 'rgba(255, 149, 0, 0.14)', fg: '#C46A00' },
    off: { bg: 'rgba(142, 142, 147, 0.16)', fg: 'var(--tg-theme-hint-color)' },
    brand: { bg: 'var(--brand-soft, #E9F7EF)', fg: 'var(--brand-ink, #1D7A46)' },
  }[tone];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
};

/** Время и дата по Ташкенту, независимо от часового пояса телефона. */
export const tashkent = {
  date: (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10),
  time: (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(11, 16),
  today: () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10),
};

export const localeFor = (lang: string) => (lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU');

export const money = (n: number | null | undefined) => (n == null ? '' : `${n.toLocaleString('ru-RU')} UZS`);

// ---------- Формы ----------

export const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: 'none', fontSize: 16,
  backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
};

export const fieldLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', margin: '14px 2px 6px' };

const tgApp = () => (window as any).Telegram?.WebApp;

/** Сообщение: в Telegram — нативное окно, в браузере — alert. */
export const tgAlert = (message: string) => (tgApp()?.showAlert ? tgApp().showAlert(message) : alert(message));

/** Подтверждение «Да/Нет»: в Telegram — нативное окно, в браузере — confirm. */
export const tgConfirm = (message: string) => new Promise<boolean>((resolve) => {
  if (tgApp()?.showConfirm) tgApp().showConfirm(message, (ok: boolean) => resolve(ok));
  else resolve(window.confirm(message));
});
