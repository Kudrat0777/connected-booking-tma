// Отзыв клиента о конкретном визите: звёзды, быстрые метки и комментарий.
import React, { useEffect, useRef, useState } from 'react';

import { addReview, Booking } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Chip, PrimaryButton, card, inputStyle, localeFor, page, tgAlert } from '../components/ui';

type Props = {
  booking: Booking;
  onBack: () => void;
  onDone: () => void;
};

const STAR = '#F5A623';
const haptic = (kind: 'select' | 'success' | 'error' = 'select') => {
  const h = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  if (kind === 'select') h.selectionChanged();
  else h.notificationOccurred(kind);
};

export const LeaveReviewScreen: React.FC<Props> = ({ booking, onBack, onDone }) => {
  const { t, lang } = useLanguage();
  const existing = booking.my_review || null;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState(existing?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, []);

  const good = rating >= 4;
  const tagOptions = rating ? t(good ? 'lr_tags_good' : 'lr_tags_bad').split('|') : [];
  // При переходе между «хорошо» и «плохо» метки другие — сбрасываем выбранные
  useEffect(() => { setTags([]); }, [good]);

  const masterName = booking.master_name || '';
  const date = new Date(booking.slot.time).toLocaleDateString(localeFor(lang), {
    day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent',
  });

  const submit = async () => {
    if (!rating) return;
    const text = [tags.join(', '), comment.trim()].filter(Boolean).join('. ');
    setBusy(true);
    try {
      await addReview({ booking_id: booking.id, rating, text });
      haptic('success');
      setDone(true);
    } catch (e: any) {
      haptic('error');
      tgAlert(e.message);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 8 }}>
        <Konnektik mood="happy" size={140} />
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{t('lr_done_title')}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', maxWidth: 300, lineHeight: 1.4 }}>{t('lr_done_text')}</div>
        <div style={{ color: STAR, fontSize: 28, letterSpacing: 2, margin: '6px 0 14px' }}>{'★'.repeat(rating)}</div>
        <div style={{ width: '100%', maxWidth: 360 }}><PrimaryButton onClick={onDone}>{t('lr_done_btn')}</PrimaryButton></div>
      </div>
    );
  }

  return (
    <div style={{ ...page, padding: '16px 16px 110px' }}>
      {/* Кого оцениваем */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar src={booking.master_info?.avatar_url} name={masterName || '?'} size={52} radius={16} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{masterName}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>{booking.service_name} · {date}</div>
        </div>
      </div>

      {/* Звёзды */}
      <div style={{ ...card, marginTop: 12, textAlign: 'center', padding: '22px 14px' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{t('lr_title')}</div>
        {existing && <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 6 }}>{t('lr_already')}</div>}
        <div role="radiogroup" aria-label={t('lr_title')} style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`}
              onClick={() => { haptic(); setRating(n); }}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: 2, fontSize: 44, lineHeight: 1,
                color: n <= rating ? STAR : 'var(--tg-theme-hint-color)', opacity: n <= rating ? 1 : 0.3,
                transform: n === rating ? 'scale(1.12)' : 'none', transition: 'transform .12s, opacity .12s',
              }}>★</button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontWeight: 700, color: rating ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-hint-color)' }}>
          {rating ? t(`lr_r${rating}`) : t('lr_rate_hint')}
        </div>
      </div>

      {/* Метки и комментарий — после выбора оценки */}
      {rating > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tagOptions.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Chip key={tag} active={on} onClick={() => { haptic(); setTags((x) => (on ? x.filter((y) => y !== tag) : [...x, tag])); }}>
                  {tag}
                </Chip>
              );
            })}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4}
            placeholder={t(good ? 'lr_comment_good' : 'lr_comment_bad')} aria-label={t(good ? 'lr_comment_good' : 'lr_comment_bad')}
            style={{ ...inputStyle, marginTop: 12, resize: 'vertical', lineHeight: 1.4 }} />
        </div>
      )}

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -6px 16px rgba(0,0,0,0.06)',
      }}>
        <PrimaryButton onClick={submit} loading={busy} disabled={!rating}>{existing ? t('lr_update') : t('lr_submit')}</PrimaryButton>
      </div>
    </div>
  );
};
