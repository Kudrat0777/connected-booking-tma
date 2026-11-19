// Отзывы мастера: средняя оценка, распределение по звёздам и сами отзывы.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { fetchMasterReviews, Review } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Chip, card, localeFor, page } from '../components/ui';

type Props = { telegramId: number; onBack: () => void };
type Filter = 'all' | 'text' | 1 | 2 | 3 | 4 | 5;

const STAR = '#F5A623';

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span aria-label={`${value} / 5`} style={{ color: STAR, fontSize: size, letterSpacing: 1, whiteSpace: 'nowrap' }}>
    {'★'.repeat(Math.round(value))}<span style={{ opacity: 0.25 }}>{'★'.repeat(5 - Math.round(value))}</span>
  </span>
);

export const MasterReviewsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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

  useEffect(() => {
    fetchMasterReviews(telegramId).then(setReviews).catch(() => setReviews([]));
  }, [telegramId]);

  const list = reviews ?? [];
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  const byStars = useMemo(() => [5, 4, 3, 2, 1].map((s) => ({ s, n: list.filter((r) => r.rating === s).length })), [list]);
  const withText = list.filter((r) => r.text?.trim()).length;
  const shown = list.filter((r) => (filter === 'all' ? true : filter === 'text' ? !!r.text?.trim() : r.rating === filter));

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
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{t('rv_empty')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{t('rv_empty_desc')}</div>
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
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
