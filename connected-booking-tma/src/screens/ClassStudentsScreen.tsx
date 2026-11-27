// Ученики инструктора (по согласованному макету): поиск, фильтры «Ходят / Новые / Давно не были»,
// сколько занятий, ближайшая запись или когда был, в какие группы ходит.
import React, { useEffect, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { ClassStudent, fetchClassStudents } from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Chip, PrimaryButton, card, localeFor, page } from '../components/ui';
import { useWhen } from './ClientHomeScreen';

type Kind = 'all' | 'active' | 'new' | 'lost';
const KINDS: Kind[] = ['all', 'active', 'new', 'lost'];

export const ClassStudentsScreen: React.FC<{ onOpenStudent: (telegramId: number) => void }> = ({ onOpenStudent }) => {
  const { t, lang } = useLanguage();
  const when = useWhen();
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ClassStudent[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(false);
    const id = window.setTimeout(() => {
      fetchClassStudents(query.trim(), kind)
        .then((d) => { if (!alive) return; setItems(d); if (kind === 'all' && !query.trim()) setTotal(d.length); })
        .catch(() => alive && setError(true));
    }, query ? 250 : 0);
    return () => { alive = false; window.clearTimeout(id); };
  }, [query, kind, attempt]);

  const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'short' });
  const line = (s: ClassStudent) => {
    const parts = [fill(t('cs_classes'), { n: s.total })];
    if (s.next) parts.push(fill(t(s.next.status === 'waiting' ? 'cs_next_wait' : 'cs_next'), { when: when(s.next.start) }));
    else if (s.last) parts.push(fill(t('cs_last'), { date: date(s.last) }));
    return parts.join(' · ');
  };

  return (
    <div style={{ ...page, padding: '20px 16px 110px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{t('cs_title')}</h1>
        {total != null && <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--tg-theme-hint-color)' }}>{total}</span>}
      </div>

      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('cs_search')} aria-label={t('cs_search')}
        style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, height: 44, padding: '0 14px', borderRadius: 12, border: 'none',
          fontSize: 15, fontFamily: 'inherit', backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }} />

      <div role="radiogroup" style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {KINDS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t(`cs_${k}`)}</Chip>)}
      </div>

      {error ? (
        <div style={{ ...card, marginTop: 14, textAlign: 'center', padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('cs_error')}</div>
          <PrimaryButton variant="soft" onClick={() => setAttempt((n) => n + 1)}>{t('cs_retry')}</PrimaryButton>
        </div>
      ) : items === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></div>
      ) : items.length === 0 ? (
        <div style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
          <Konnektik mood="think" size={110} />
          <div style={{ fontWeight: 800, marginTop: 10 }}>{total === 0 ? t('cs_empty') : t('cs_nothing')}</div>
          {total === 0 && <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4, lineHeight: 1.4 }}>{t('cs_empty_hint')}</div>}
        </div>
      ) : (
        <div style={{ ...card, marginTop: 12, padding: 0, overflow: 'hidden' }}>
          {items.map((s, i) => (
            <button key={s.telegram_id} type="button" onClick={() => onOpenStudent(s.telegram_id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', border: 'none', cursor: 'pointer',
              borderTop: i ? '1px solid rgba(127,127,127,0.15)' : 'none', background: 'none', textAlign: 'left',
              color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
            }}>
              <Avatar name={s.name || '?'} size={44} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '—'}</span>
                  {s.tag && (
                    <span style={{
                      flex: '0 0 auto', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      backgroundColor: s.tag === 'new' ? 'var(--brand-soft)' : 'rgba(245,166,35,0.18)',
                      color: s.tag === 'new' ? 'var(--brand-ink)' : '#C46A00',
                    }}>{t(`cs_tag_${s.tag}`)}</span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{line(s)}</span>
                {s.groups.length > 0 && <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', opacity: 0.85 }}>{s.groups.join(' · ')}</span>}
              </span>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

