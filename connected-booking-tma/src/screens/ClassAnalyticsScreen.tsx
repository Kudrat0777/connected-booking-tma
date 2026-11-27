// Аналитика инструктора групповых занятий (по согласованному макету): записи, ученики,
// заполненность групп, программы, кто давно не записывался и откуда приходят.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { ClassAnalytics, fetchClassAnalytics } from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { sourceLabel } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Chip, PrimaryButton, card, localeFor, page } from '../components/ui';

type Period = ClassAnalytics['period'];
const PERIODS: Period[] = ['week', 'month', 'half'];

type Props = { onBack: () => void; /** Вкладка кабинета: назад не нужен, снизу меню */ embedded?: boolean };

const h2: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 800 };
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)' };
const track: React.CSSProperties = { height: 8, borderRadius: 4, backgroundColor: 'rgba(127,127,127,0.18)', overflow: 'hidden' };

export const ClassAnalyticsScreen: React.FC<Props> = ({ onBack, embedded }) => {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton || embedded) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [embedded]);

  useEffect(() => {
    let alive = true;
    setError(false);
    setData(null);
    fetchClassAnalytics(period).then((d) => alive && setData(d)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [period, attempt]);

  const date = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, opts);
  const barLabel = (b: ClassAnalytics['bars'][number]) =>
    period === 'week' ? date(b.start, { weekday: 'short' })
      : period === 'month' ? date(b.start, { day: 'numeric', month: 'short' })
        : date(b.start, { month: 'short' });

  const delta = data ? data.signups - data.prev_signups : 0;
  const deltaText = !data ? '' : delta > 0 ? fill(t('ca_delta_up'), { n: delta })
    : delta < 0 ? fill(t('ca_delta_down'), { n: -delta }) : t('ca_delta_same');
  const maxBar = data ? Math.max(1, ...data.bars.map((b) => b.count)) : 1;
  const sourcesTotal = data ? data.sources.reduce((n, s) => n + s.count, 0) : 0;
  const empty = data && data.signups === 0 && data.held === 0;

  const tile = (label: string, value: string, sub: string, accent = false) => (
    <div style={{ ...card, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={hint}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 12, color: accent ? 'var(--brand-ink)' : 'var(--tg-theme-hint-color)' }}>{sub}</span>
    </div>
  );

  return (
    <div style={{ ...page, padding: '20px 16px 110px' }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{t('ca_title')}</h1>
      <div role="radiogroup" style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {PERIODS.map((p) => <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{t(`ca_${p}`)}</Chip>)}
      </div>

      {error ? (
        <div style={{ ...card, marginTop: 16, textAlign: 'center', padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('ca_error')}</div>
          <PrimaryButton variant="soft" onClick={() => setAttempt((n) => n + 1)}>{t('ca_retry')}</PrimaryButton>
        </div>
      ) : !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></div>
      ) : empty ? (
        <div style={{ ...card, marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
          <Konnektik mood="think" size={110} />
          <div style={{ fontWeight: 800, marginTop: 10 }}>{t('ca_empty')}</div>
          <div style={{ ...hint, marginTop: 4 }}>{t('ca_empty_hint')}</div>
        </div>
      ) : (
        <>
          <div style={{
            marginTop: 14, padding: 16, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 4,
            backgroundColor: 'var(--brand-accent)', color: 'var(--brand-on-accent)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t('ca_signups')}</span>
            <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.05 }}>{data.signups}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{deltaText}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8 }}>
            {tile(t('ca_students'), String(data.students), fill(t('ca_new'), { n: data.newcomers }), true)}
            {tile(t('ca_fill'), data.fill == null ? '—' : `${data.fill}%`, data.fill == null ? t('ca_fill_none') : t('ca_fill_hint'))}
            {tile(t('ca_held'), String(data.held), fill(t('ca_canceled'), { n: data.canceled }))}
            {tile(t('ca_dropped'), String(data.dropped), t('ca_dropped_hint'))}
          </div>

          <section style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={h2}>{t('ca_chart')}</h2>
              <span style={{ ...hint, fontSize: 12 }}>{t(period === 'week' ? 'ca_by_day' : period === 'month' ? 'ca_by_week' : 'ca_by_month')}</span>
            </div>
            <div role="img" aria-label={data.bars.map((b) => `${barLabel(b)}: ${b.count}`).join(', ')}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
              {data.bars.map((b, i) => (
                <div key={b.start} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{b.count}</span>
                  <div style={{
                    width: '100%', height: Math.max(4, Math.round((b.count / maxBar) * 90)), borderRadius: '8px 8px 4px 4px',
                    backgroundColor: i === data.bars.length - 1 ? 'var(--brand-accent)' : 'rgba(80,200,120,0.4)',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap' }}>{barLabel(b)}</span>
                </div>
              ))}
            </div>
          </section>

          {data.groups.length > 0 && (
            <section style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={h2}>{t('ca_groups')}</h2>
              {data.groups.map((g) => (
                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{g.name} · {g.start}</span>
                    <span style={{ ...hint, whiteSpace: 'nowrap' }}>{fill(t('ca_avg'), { n: g.avg.toLocaleString(locale) })}</span>
                  </div>
                  {g.fill != null && (
                    <div style={track}><div style={{ width: `${Math.min(100, g.fill)}%`, height: '100%', backgroundColor: 'var(--brand-accent)' }} /></div>
                  )}
                  <span style={{ ...hint, fontSize: 12 }}>
                    {g.fill != null ? fill(t('ca_group_fill'), { n: g.fill, cap: g.capacity ?? '' }) : fill(t('ca_group_nocap'), { n: g.sessions })}
                  </span>
                </div>
              ))}
            </section>
          )}

          {data.programs.length > 0 && (
            <section style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={h2}>{t('ca_programs')}</h2>
              {data.programs.slice(0, 3).map((p, i) => (
                <div key={p.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)',
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{p.title}</span>
                  <span style={{ ...hint, whiteSpace: 'nowrap' }}>{fill(t('ca_prog_avg'), { n: p.avg.toLocaleString(locale) })}</span>
                </div>
              ))}
            </section>
          )}

          {data.lost.length > 0 && (
            <section style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <h2 style={h2}>{t('ca_lost')}</h2>
                <div style={{ ...hint, marginTop: 2 }}>{t('ca_lost_hint')}</div>
              </div>
              {data.lost.map((l) => (
                <div key={l.telegram_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={l.name || '?'} size={36} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name || '—'}</span>
                    <span style={{ ...hint, fontSize: 12 }}>{fill(t('ca_last'), { date: date(l.last, { day: 'numeric', month: 'long' }) })}</span>
                  </span>
                  {l.username && (
                    <a href={`https://t.me/${l.username}`} target="_blank" rel="noreferrer" style={{
                      height: 32, padding: '0 12px', borderRadius: 10, display: 'flex', alignItems: 'center', textDecoration: 'none',
                      fontSize: 13, fontWeight: 700, backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)',
                    }}>{t('ca_write')}</a>
                  )}
                </div>
              ))}
            </section>
          )}

          <section style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={h2}>{t('ca_sources')}</h2>
            {data.sources.map((s) => {
              const pct = sourcesTotal ? Math.round((s.count / sourcesTotal) * 100) : 0;
              return (
                <div key={s.source || 'direct'} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{s.source === 'push' ? t('ca_src_push') : sourceLabel(s.source, t)}</span><span style={hint}>{pct}%</span>
                  </div>
                  <div style={{ ...track, height: 6 }}><div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#5B9BF0' }} /></div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(127,127,127,0.18)', fontSize: 14 }}>
              <span style={hint}>{t('ca_subscribers')}</span><span style={{ fontWeight: 800 }}>{data.subscribers}</span>
            </div>
          </section>

          <p style={{ ...hint, fontSize: 12, textAlign: 'center', margin: '14px 8px 0', lineHeight: 1.45 }}>{t('ca_note')}</p>
        </>
      )}
    </div>
  );
};
