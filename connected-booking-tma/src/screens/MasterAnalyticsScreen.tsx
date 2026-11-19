// Статистика мастера: выручка за период, ключевые цифры, популярные услуги и источники клиентов.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { fetchMasterAnalytics, AnalyticsData } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { LINK_SOURCES, sourceLabel } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { Chip, PrimaryButton, card, localeFor, page } from '../components/ui';

type Props = { telegramId: number; onBack: () => void };

const PERIODS = ['day', 'week', 'month', 'half_year', 'year'] as const;
type Period = typeof PERIODS[number];

export const MasterAnalyticsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const { t, lang } = useLanguage();
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
    let alive = true;
    setLoading(true);
    setError(false);
    fetchMasterAnalytics(telegramId, period)
      .then((res) => { if (alive) setData(res); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [telegramId, period, attempt]);

  const locale = localeFor(lang);
  const num = (n: number) => Math.round(n).toLocaleString(locale);
  const sum = (n: number) => `${num(n)} UZS`;

  const earned = data?.earned ?? 0;
  const expected = data?.expected ?? 0;
  const visits = data?.total_completed ?? 0;
  const avgCheck = data?.average_check ?? 0;
  const clients = data?.unique_clients ?? 0;
  const rejected = data?.rejected_count ?? 0;
  const rejectRate = data?.cancel_rate ?? 0;
  const top = data?.top_services ?? [];
  const sources = (data?.sources ?? []).filter((s) => s.visits > 0 || s.bookings > 0);
  const isEmpty = !!data && visits === 0 && expected === 0 && rejected === 0 && sources.length === 0;

  const topMax = Math.max(1, ...top.map((s) => s.revenue));
  const srcMax = Math.max(1, ...sources.map((s) => Math.max(s.visits, s.bookings)));
  const srcEmoji = (id: string) => LINK_SOURCES.find((s) => s.id === id)?.emoji ?? (id === 'manual' ? '✍️' : '🔗');

  const tile = (label: string, value: string, hint?: string, tone?: 'warn') => (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: tone === 'warn' ? '#E0533D' : undefined }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{hint}</div>}
    </div>
  );

  const bar = (share: number, color = 'var(--brand-accent, #50C878)') => (
    <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--tg-theme-secondary-bg-color)', marginTop: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(4, Math.round(share * 100))}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </div>
  );

  return (
    <div style={{ ...page, paddingBottom: 40 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, padding: '16px 16px 10px', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{t('an_title')}</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10, scrollbarWidth: 'none' }}>
          {PERIODS.map((p) => (
            <Chip key={p} active={period === p} onClick={() => {
              (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
              setPeriod(p);
            }}>{t(`m_period_${p}`)}</Chip>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading && !data ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size="l" /></div>
        ) : error ? (
          <div style={{ ...card, textAlign: 'center', padding: 24, marginTop: 8 }}>
            <div style={{ marginBottom: 14 }}>{t('an_error')}</div>
            <PrimaryButton variant="soft" onClick={() => setAttempt((a) => a + 1)}>{t('an_retry')}</PrimaryButton>
          </div>
        ) : isEmpty ? (
          <div style={{ ...card, textAlign: 'center', padding: '24px 20px', marginTop: 8 }}>
            <Konnektik mood="think" size={110} />
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{t('an_empty')}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{t('an_empty_desc')}</div>
          </div>
        ) : data && (
          <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity .15s' }}>
            {/* Выручка */}
            <div style={{ ...card, padding: 18, marginTop: 4, background: 'linear-gradient(135deg, var(--brand-accent, #50C878), #3FAF68)', color: 'var(--brand-on-accent, #14261B)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>{t('an_earned')}</div>
              <div style={{ fontSize: 34, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>
                {num(earned)} <span style={{ fontSize: 18, fontWeight: 700 }}>UZS</span>
              </div>
              {expected > 0 && (
                <div style={{ fontSize: 14, marginTop: 6, fontWeight: 600, opacity: 0.85 }}>↗ {fill(t('an_expected'), { sum: sum(expected) })}</div>
              )}
            </div>

            {/* Ключевые цифры */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {tile(t('an_visits'), num(visits))}
              {tile(t('an_avg_check'), sum(avgCheck))}
              {tile(t('an_clients'), num(clients))}
              {tile(t('an_rejected'), num(rejected), rejected > 0 ? fill(t('an_rejected_hint'), { rate: rejectRate }) : undefined, rejected > 0 ? 'warn' : undefined)}
            </div>

            {/* Популярные услуги */}
            {top.length > 0 && (
              <div style={{ ...card, marginTop: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{t('an_top_services')}</div>
                {top.map((s, i) => (
                  <div key={s.slot__service__name + i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--tg-theme-secondary-bg-color)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.slot__service__name}</span>
                      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{sum(s.revenue)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{pluralize(lang, s.count, t('an_bookings_word'))}</div>
                    {bar(s.revenue / topMax)}
                  </div>
                ))}
              </div>
            )}

            {/* Источники */}
            {sources.length > 0 && (
              <div style={{ ...card, marginTop: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{t('an_sources')}</div>
                {sources.map((s, i) => (
                  <div key={s.source} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--tg-theme-secondary-bg-color)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden="true">{srcEmoji(s.source)}</span>
                      <span style={{ fontWeight: 600, flex: 1 }}>{sourceLabel(s.source, t)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                      {pluralize(lang, s.visits, t('an_visits_word'))} · {pluralize(lang, s.bookings, t('an_bookings_word'))}
                    </div>
                    {bar(Math.max(s.visits, s.bookings) / srcMax, '#5B8DEF')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
