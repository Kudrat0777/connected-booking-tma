// Вкладка «Перерывы» в «Группах и программах»: праздники, отпуск, семинары.
// Даты, все группы или выбранные, своё сообщение ученикам; перед сохранением видно, кого заденет.
import React, { useEffect, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { ClassGroup, ClassPause, createPause, deletePause, fetchPauses, previewPause } from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { ask, tell } from './ClassSchedule';
import { Chip, PrimaryButton, Sheet, card, fieldLabel, inputStyle, localeFor, tashkent } from './ui';

const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 };

export const ClassPauses: React.FC<{ groups: ClassGroup[]; onChanged: () => void }> = ({ groups, onChanged }) => {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const [items, setItems] = useState<ClassPause[] | null>(null);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(tashkent.today());
  const [to, setTo] = useState(tashkent.today());
  const [picked, setPicked] = useState<number[]>([]); // пусто — все группы
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [affected, setAffected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchPauses().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  // Сколько записей снимется — пересчитываем при смене дат и групп
  useEffect(() => {
    if (!open || !from || !to || from > to) { setAffected(null); return; }
    let alive = true;
    const id = window.setTimeout(() => {
      previewPause({ start_date: from, end_date: to, groups: picked }).then((r) => alive && setAffected(r.affected)).catch(() => alive && setAffected(null));
    }, 250);
    return () => { alive = false; window.clearTimeout(id); };
  }, [open, from, to, picked]);

  const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const range = (p: { start_date: string; end_date: string }) =>
    p.start_date === p.end_date ? date(p.start_date) : `${date(p.start_date)} – ${date(p.end_date)}`;
  const toggle = (id: number) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const startNew = () => {
    setFrom(tashkent.today()); setTo(tashkent.today()); setPicked([]); setNote(''); setMessage(''); setAffected(null); setOpen(true);
  };
  const save = async () => {
    if (!from || !to || from > to) { tell(t('gp_err_dates')); return; }
    setBusy(true);
    try {
      await createPause({ start_date: from, end_date: to, groups: picked, note: note.trim(), message: message.trim() });
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setOpen(false);
      load();
      onChanged();
    } catch (e: any) {
      tell(e?.message || t('gc_err'));
    } finally { setBusy(false); }
  };
  const remove = async (p: ClassPause) => {
    if (!(await ask(t('gp_delete_q')))) return;
    try { await deletePause(p.id); load(); onChanged(); } catch { tell(t('gc_err')); }
  };

  return (
    <>
      <div style={{ ...hint, margin: '0 4px 10px' }}>{t('gp_hint')}</div>
      {items === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="m" /></div>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 20, ...hint }}>{t('gp_empty')}</div>
      ) : items.map((p) => (
        <div key={p.id} style={{ ...card, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{p.note || range(p)}</span>
            <span style={hint}>
              {p.note ? `${range(p)} · ` : ''}{p.groups.length ? p.groups.map((g) => g.name).join(', ') : t('gp_all')}
            </span>
            {p.message && <span style={{ ...hint, fontStyle: 'italic' }}>«{p.message}»</span>}
          </div>
          <button type="button" onClick={() => remove(p)} style={{
            border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', fontFamily: 'inherit', fontSize: 14, padding: 4,
          }}>{t('gp_delete')}</button>
        </div>
      ))}
      <div style={{ marginTop: 10 }}><PrimaryButton onClick={startNew}>+ {t('gp_add')}</PrimaryButton></div>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{t('gp_new')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={fieldLabel}>{t('gp_from')}</span>
              <input type="date" value={from} min={tashkent.today()} style={inputStyle}
                onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={fieldLabel}>{t('gp_to')}</span>
              <input type="date" value={to} min={from} style={inputStyle} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div style={fieldLabel}>{t('gp_groups')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip onCard active={picked.length === 0} onClick={() => setPicked([])}>{t('gp_all')}</Chip>
            {groups.map((g) => <Chip onCard key={g.id} active={picked.includes(g.id)} onClick={() => toggle(g.id)}>{g.name}</Chip>)}
          </div>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={fieldLabel}>{t('gp_note')}</span>
            <input type="text" value={note} maxLength={120} placeholder={t('gp_note_ph')} style={inputStyle} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={fieldLabel}>{t('gp_message')}</span>
            <textarea rows={2} value={message} maxLength={500} placeholder={t('gp_message_ph')}
              style={{ ...inputStyle, resize: 'none' }} onChange={(e) => setMessage(e.target.value)} />
          </label>
          {affected !== null && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.4,
              backgroundColor: affected ? 'rgba(245,166,35,0.15)' : 'var(--brand-soft)', color: affected ? '#C46A00' : 'var(--brand-ink)',
            }}>
              {affected ? fill(t('gp_affected'), { n: affected }) : t('gp_affected_none')}
            </div>
          )}
          <div style={{ marginTop: 14 }}><PrimaryButton loading={busy} onClick={save}>{t('gp_save')}</PrimaryButton></div>
        </Sheet>
      )}
    </>
  );
};
