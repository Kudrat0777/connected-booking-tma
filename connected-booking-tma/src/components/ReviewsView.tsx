// Список отзывов о мастере: средняя оценка, распределение по звёздам, фильтры и сами отзывы.
// Используется и в кабинете мастера (canReply — можно отвечать), и у клиента на странице мастера.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import type { Review } from '../helpers/api';
import { replyToReview } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from './Konnektik';
import { Avatar, Chip, PrimaryButton, Sheet, card, inputStyle, localeFor, page, tgAlert, tgConfirm } from './ui';

type Props = {
  load: () => Promise<Review[]>;
  onBack: () => void;
  emptyTitle: string;
  emptyText: string;
  /** Кабинет мастера: можно отвечать на отзывы */
  canReply?: boolean;
};
type Filter = 'all' | 'text' | 'noreply' | 1 | 2 | 3 | 4 | 5;

const STAR = '#F5A623';

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span aria-label={`${value} / 5`} style={{ color: STAR, fontSize: size, letterSpacing: 1, whiteSpace: 'nowrap' }}>
    {'★'.repeat(Math.round(value))}<span style={{ opacity: 0.25 }}>{'★'.repeat(5 - Math.round(value))}</span>
  </span>
);

export const ReviewsView: React.FC<Props> = ({ load, onBack, emptyTitle, emptyText, canReply }) => {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  // Окно ответа: какой отзыв и черновик ответа
  const [replying, setReplying] = useState<Review | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

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

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    loadRef.current().then(setReviews).catch(() => setReviews([]));
  }, []);

  const list = reviews ?? [];
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  const byStars = useMemo(() => [5, 4, 3, 2, 1].map((s) => ({ s, n: list.filter((r) => r.rating === s).length })), [list]);
  const withText = list.filter((r) => r.text?.trim()).length;
  const noReply = list.filter((r) => !r.reply_text?.trim()).length;
  const shown = list.filter((r) => (
    filter === 'all' ? true
      : filter === 'text' ? !!r.text?.trim()
        : filter === 'noreply' ? !r.reply_text?.trim()
          : r.rating === filter));

  const openReply = (r: Review) => {
    (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    setReplying(r);
    setDraft(r.reply_text || '');
  };
  const saveReply = async (text: string) => {
    if (!replying) return;
    setSaving(true);
    try {
      const updated = await replyToReview(replying.id, text);
      setReviews((rs) => (rs || []).map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setReplying(null);
    } catch (e: any) {
      tgAlert(e.message);
    } finally { setSaving(false); }
  };

  const locale = localeFor(lang);
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tashkent' });

  if (reviews === null) {
    return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 100 }}><Spinner size="l" /></div>;
  }

  return (
    <div style={{ ...page, padding: '16px 16px 40px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, margin: '0 2px 12px' }}>{t('rv_title')}</div>

      {list.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '24px 20px' }}>
          <Konnektik mood="hello" size={110} />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{emptyTitle}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{emptyText}</div>
        </div>
      ) : (
        <>
          {/* Сводка */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18, padding: 18 }}>
            <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{avg.toFixed(1)}</div>
              <div style={{ marginTop: 6 }}><Stars value={avg} size={16} /></div>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{pluralize(lang, list.length, t('rv_count'))}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {byStars.map(({ s, n }) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                  <span style={{ width: 10, textAlign: 'right' }}>{s}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--tg-theme-secondary-bg-color)', overflow: 'hidden' }}>
                    <div style={{ width: `${(n / list.length) * 100}%`, height: '100%', backgroundColor: STAR, borderRadius: 3 }} />
                  </div>
                  <span style={{ width: 16 }}>{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Фильтры: только те, по которым есть отзывы */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '12px 0 4px', scrollbarWidth: 'none' }}>
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('rv_all')} · {list.length}</Chip>
            {canReply && noReply > 0 && noReply < list.length && (
              <Chip active={filter === 'noreply'} onClick={() => setFilter('noreply')}>{t('rv_no_reply')} · {noReply}</Chip>
            )}
            {withText > 0 && withText < list.length && (
              <Chip active={filter === 'text'} onClick={() => setFilter('text')}>{t('rv_with_text')} · {withText}</Chip>
            )}
            {byStars.filter((b) => b.n > 0).map(({ s, n }) => (
              <Chip key={s} active={filter === s} onClick={() => setFilter(s as Filter)}>{s}★ · {n}</Chip>
            ))}
          </div>

          {/* Отзывы */}
          {shown.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', padding: 24 }}>{t('rv_filter_empty')}</div>
          ) : shown.map((r, i) => {
            const author = r.author_name?.trim() || t('m_reviews_client');
            return (
              <div key={r.id ?? `${r.created_at}-${i}`} style={{ ...card, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={author} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author}</div>
                    <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{fmtDate(r.created_at)}</div>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.text?.trim() && <div style={{ fontSize: 15, lineHeight: 1.45, marginTop: 10, whiteSpace: 'pre-wrap' }}>{r.text}</div>}

                {/* Ответ мастера */}
                {r.reply_text?.trim() && (
                  <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderLeft: '3px solid var(--brand-accent, #50C878)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600 }}>
                      <span>💬 {t('rv_reply_label')}</span>
                      {r.reply_at && <span style={{ fontWeight: 400 }}>{fmtDate(r.reply_at)}</span>}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.reply_text}</div>
                  </div>
                )}
                {canReply && (
                  <button type="button" onClick={() => openReply(r)} style={{
                    marginTop: 10, padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 700, backgroundColor: 'var(--brand-soft, #E9F7EF)', color: 'var(--brand-ink, #1D7A46)',
                  }}>{r.reply_text?.trim() ? `✏️ ${t('rv_reply_edit')}` : `💬 ${t('rv_reply_btn')}`}</button>
                )}
              </div>
            );
          })}
        </>
      )}

      {replying && (
        <Sheet onClose={() => !saving && setReplying(null)}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{t('rv_reply_title')}</div>
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>{replying.author_name?.trim() || t('m_reviews_client')}</span>
              <Stars value={replying.rating} />
            </div>
            {replying.text?.trim() && <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: 6, color: 'var(--tg-theme-hint-color)' }}>{replying.text}</div>}
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={4} autoFocus
            placeholder={t('rv_reply_ph')} aria-label={t('rv_reply_title')}
            style={{ ...inputStyle, marginTop: 12, resize: 'vertical', lineHeight: 1.4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '6px 2px 0' }}>
            <span style={{ lineHeight: 1.35 }}>{t('rv_reply_hint')}</span>
            <span style={{ flex: '0 0 auto' }}>{draft.length} / 1000</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <PrimaryButton loading={saving} disabled={!draft.trim() || draft.trim() === (replying.reply_text || '').trim()} onClick={() => saveReply(draft)}>
              {t('rv_reply_save')}
            </PrimaryButton>
            {replying.reply_text?.trim() && (
              <PrimaryButton variant="danger" onClick={async () => { if (await tgConfirm(t('rv_reply_delete_confirm'))) saveReply(''); }}>
                {t('rv_reply_delete')}
              </PrimaryButton>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
};
