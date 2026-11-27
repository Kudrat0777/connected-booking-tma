// Карточка ученика инструктора (по согласованному макету): связь, занятия, следующее занятие,
// группы, заметка и история записей.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { ClassStudentCard, fetchClassStudent, saveClassStudentNote } from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Avatar, PrimaryButton, card, localeFor, page } from '../components/ui';
import { useWhen } from './ClientHomeScreen';

type Props = { telegramId: number; onBack: () => void };

const h2: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 800 };
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)' };

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  booked: { backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)' },
  done: { backgroundColor: 'rgba(127,127,127,0.16)', color: 'var(--tg-theme-text-color)' },
  canceled: { backgroundColor: 'rgba(224,83,61,0.15)', color: '#E0533D' },
  waiting: { backgroundColor: 'rgba(245,166,35,0.18)', color: '#C46A00' },
};

export const ClassStudentScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const { t, lang } = useLanguage();
  const when = useWhen();
  const locale = localeFor(lang);
  const [data, setData] = useState<ClassStudentCard | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
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

  useEffect(() => {
    let alive = true;
    setError(false);
    fetchClassStudent(telegramId)
      .then((d) => { if (!alive) return; setData(d); setNote(d.note); setSavedNote(d.note); })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [telegramId, attempt]);

  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale, opts);

  const saveNote = async () => {
    setSaving(true);
    try {
      const r = await saveClassStudentNote(telegramId, note);
      setSavedNote(r.note); setNote(r.note);
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch { /* остаётся несохранённой — кнопка снова активна */ } finally { setSaving(false); }
  };

  if (error) {
    return (
      <div style={{ ...page, padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, margin: '40px 0 12px' }}>{t('cs_error')}</div>
        <PrimaryButton variant="soft" onClick={() => setAttempt((n) => n + 1)}>{t('cs_retry')}</PrimaryButton>
      </div>
    );
  }
  if (!data) return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner size="l" /></div>;

  const trend = data.this_month > data.prev_month ? t('cs_more') : data.this_month < data.prev_month ? t('cs_less') : t('cs_same');
  const subtitle = [data.since && fill(t('cs_since'), { date: date(data.since) }), data.subscribed && t('cs_subscribed')]
    .filter(Boolean).join(' · ');
  const tile = (label: string, value: string, sub: string, accent = false, small = false) => (
    <div style={{ ...card, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={hint}>{label}</span>
      <span style={{ fontSize: small ? 18 : 24, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 12, color: accent ? 'var(--brand-ink)' : 'var(--tg-theme-hint-color)' }}>{sub}</span>
    </div>
  );
  const linkBtn = (primary: boolean): React.CSSProperties => ({
    height: 44, borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: primary ? 'var(--brand-soft)' : 'var(--tg-theme-bg-color)',
    color: primary ? 'var(--brand-ink)' : 'var(--tg-theme-text-color)',
  });

  return (
    <div style={{ ...page, padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar name={data.name || '?'} size={64} radius={22} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{data.name || '—'}</h1>
          {subtitle && <div style={{ ...hint, fontSize: 14, marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>

      {(data.username || data.phone) && (
        <div style={{ display: 'grid', gridTemplateColumns: data.username && data.phone ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8, marginTop: 14 }}>
          {data.username && <a href={`https://t.me/${data.username}`} target="_blank" rel="noreferrer" style={linkBtn(true)}>Telegram</a>}
          {data.phone && <a href={`tel:${data.phone}`} style={linkBtn(false)}>{t('cs_call')}</a>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
        {tile(t('cs_total'), String(data.total), t('cs_total_hint'))}
        {tile(t('cs_month'), String(data.this_month), trend, data.this_month > data.prev_month)}
        {tile(t('cs_last_title'), data.last ? date(data.last.date) : '—',
          data.last ? [data.last.group, data.last.program].filter(Boolean).join(' · ') : '', false, true)}
        {tile(t('cs_canceled'), String(data.canceled), t('cs_canceled_hint'))}
      </div>

      {data.next && (
        <div style={{ ...card, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--brand-soft)' }}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5h16v13H4z" /><path d="M4 10.5h16M8.5 4v4M15.5 4v4" /><circle cx="12" cy="15" r="1.7" fill="var(--brand-accent)" stroke="none" />
          </svg>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-ink)' }}>{t('cs_next_title')}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{when(data.next.start)}</span>
            <span style={hint}>{[data.next.group, data.next.program && fill(t('cs_program'), { name: data.next.program })].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
      )}

      {data.groups.length > 0 && (
        <section style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={h2}>{t('cs_groups')}</h2>
          {data.groups.map((g) => (
            <div key={g.name + g.start} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ fontWeight: 600 }}>{g.name} · {g.start}</span>
              <span style={hint}>{fill(t('cs_classes'), { n: g.count })}</span>
            </div>
          ))}
        </section>
      )}

      <section style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={h2}>{t('cs_note')}</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={hint}>{t('cs_note_hint')}</span>
          <textarea rows={3} value={note} maxLength={2000} placeholder={t('cs_note_ph')} onChange={(e) => setNote(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 12, border: 'none', fontSize: 15, fontFamily: 'inherit', resize: 'none',
              backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }} />
        </label>
        <PrimaryButton variant="soft" disabled={note.trim() === savedNote.trim()} loading={saving} onClick={saveNote}>
          {note.trim() === savedNote.trim() && savedNote ? t('cs_saved') : t('cs_save')}
        </PrimaryButton>
      </section>

      {data.history.length > 0 && (
        <section style={{ ...card, marginTop: 12 }}>
          <h2 style={{ ...h2, marginBottom: 4 }}>{t('cs_history')}</h2>
          {data.history.map((h, i) => (
            <div key={`${h.date}-${h.group}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderTop: i ? '1px solid rgba(127,127,127,0.15)' : 'none',
            }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{date(h.date, { day: 'numeric', month: 'short' })} · {h.group}</span>
                {h.program && <span style={hint}>{h.program}</span>}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...STATUS_STYLE[h.status] }}>
                {t(`cs_st_${h.status}`)}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
