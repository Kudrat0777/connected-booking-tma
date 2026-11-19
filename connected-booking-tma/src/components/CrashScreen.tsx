// Экран вместо пустого (чёрного в тёмной теме) окна, если при отрисовке что-то упало.
import React from 'react';

const TEXTS = {
  ru: { title: 'Что-то пошло не так', hint: 'Попробуйте открыть экран ещё раз.', retry: 'Попробовать снова' },
  uz: { title: 'Nimadir xato ketdi', hint: "Ekranni qaytadan ochib ko'ring.", retry: "Qayta urinish" },
  en: { title: 'Something went wrong', hint: 'Please try opening the screen again.', retry: 'Try again' },
};

export const CrashScreen: React.FC<{ error: unknown }> = ({ error }) => {
  let code = 'ru';
  try {
    code = localStorage.getItem('app_manual_lang')
      || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code || 'ru';
  } catch { /* хранилище недоступно — оставляем русский */ }
  const t = TEXTS[(code as keyof typeof TEXTS)] || TEXTS.ru;
  console.error('Render crash:', error);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 24, textAlign: 'center', boxSizing: 'border-box',
      backgroundColor: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #000)',
    }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{t.title}</div>
      <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color, #8e8e93)', maxWidth: 300 }}>{t.hint}</div>
      <button type="button" onClick={() => window.location.reload()} style={{
        marginTop: 8, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
        fontFamily: 'inherit', backgroundColor: '#50C878', color: '#14261B',
      }}>{t.retry}</button>
    </div>
  );
};
