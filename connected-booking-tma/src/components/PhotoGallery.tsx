// Работы мастера на весь экран: сетка «Все работы» и просмотр по одной с перелистыванием.
// Управляется снаружи: index = null — сетка, число — открыта эта фотография.
// Кнопку «Назад» Telegram обрабатывает экран-владелец (см. MasterPublicProfileScreen).
import React, { useEffect, useMemo, useRef } from 'react';

import { getFullImageUrl } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';

type Props = {
  photos: string[];
  title: string;
  index: number | null;
  onIndex: (i: number | null) => void;
  onClose: () => void;
};

const roundBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 20, lineHeight: '40px', padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const haptic = () => (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();

export const PhotoGallery: React.FC<Props> = ({ photos, title, index, onIndex, onClose }) => {
  const { t } = useLanguage();
  const n = photos.length;
  // Адрес считаем один раз: getFullImageUrl добавляет ?t=…, и без этого фото скачивались бы заново при каждом пролистывании
  const key = photos.join('|');
  const urls = useMemo(() => photos.map((p) => getFullImageUrl(p) || ''), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const touchX = useRef<number | null>(null);

  const go = (d: number) => {
    if (index === null || n < 2) return;
    haptic();
    onIndex((index + d + n) % n);
  };

  // Стрелки и Esc — для просмотра с компьютера
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (e.key === 'Escape') { if (index !== null) onIndex(null); else onClose(); }
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, []);

  if (index !== null) {
    const src = urls[index];
    return (
      <div role="dialog" aria-modal="true" aria-label={title}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', color: '#fff' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{n > 1 ? fill(t('pf_of'), { i: index + 1, n }) : ''}</span>
          <button type="button" aria-label="×" style={roundBtn} onClick={() => { haptic(); onClose(); }}>✕</button>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <img key={src} src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', animation: 'pgFade .18s ease-out' }} />
          {n > 1 && (
            <>
              <button type="button" aria-label="‹" onClick={() => go(-1)} style={{ ...roundBtn, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>‹</button>
              <button type="button" aria-label="›" onClick={() => go(1)} style={{ ...roundBtn, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>›</button>
            </>
          )}
        </div>
        {n > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 12px calc(12px + env(safe-area-inset-bottom))', scrollbarWidth: 'none' }}>
            {photos.map((p, i) => (
              <button key={p + i} type="button" aria-label={`${i + 1}`} onClick={() => { haptic(); onIndex(i); }}
                style={{ flex: '0 0 auto', width: 52, height: 52, padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  border: i === index ? '2px solid #fff' : '2px solid transparent', opacity: i === index ? 1 : 0.55, background: 'none' }}>
                <img src={urls[i]} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
        <style>{'@keyframes pgFade { from { opacity: .3 } to { opacity: 1 } }'}</style>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{
      position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', color: 'var(--tg-theme-text-color)',
      backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '16px 16px 40px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{t('pf_all')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title} · {n}</div>
        </div>
        <button type="button" aria-label="×" onClick={() => { haptic(); onClose(); }}
          style={{ ...roundBtn, backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', flex: '0 0 auto' }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {photos.map((p, i) => (
          <button key={p + i} type="button" onClick={() => { haptic(); onIndex(i); }} aria-label={`${i + 1}`}
            style={{ aspectRatio: '1 / 1', padding: 0, border: 'none', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', backgroundColor: 'var(--tg-theme-bg-color)' }}>
            <img src={urls[i]} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
    </div>
  );
};
