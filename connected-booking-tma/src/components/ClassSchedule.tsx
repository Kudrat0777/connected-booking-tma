// Расписание групповых занятий на странице инструктора: программа дня, места, запись, подписка.
import React, { useEffect, useState } from 'react';

import {
  ClassDay, ClassSession, ClassSchedule as Data, askWriteAccess, classLeave, classMove, classSignup, classSubscribe,
  dayLabel, fetchClassSchedule,
} from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Badge, Chip, PrimaryButton, card, localeFor, money, tashkent } from './ui';

const tg = () => (window as any).Telegram?.WebApp;
// Вне Telegram showAlert и showConfirm есть, но бросают ошибку — тогда обычные окна браузера
export const tell = (m: string) => {
  try { if (tg()?.showAlert) { tg().showAlert(m); return; } } catch { /* старая версия или браузер */ }
  alert(m);
};
export const ask = (m: string) => new Promise<boolean>((resolve) => {
  try { if (tg()?.showConfirm) { tg().showConfirm(m, (ok: boolean) => resolve(!!ok)); return; } } catch { /* то же */ }
  resolve(window.confirm(m));
});
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)' };
const link: React.CSSProperties = {
  border: 'none', background: 'none', padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--brand-ink)',
};

export const ClassSchedule: React.FC<{ masterId: number; onLoaded?: (has: boolean) => void }> = ({ masterId, onLoaded }) => {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const [data, setData] = useState<Data | null>(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(false);

  const load = () => fetchClassSchedule(masterId).then((d) => {
    setData(d);
    onLoaded?.(d.days.length > 0);
    // Первый день, где ещё можно что-то сделать
    setDate((cur) => cur || (d.days.find((x) => x.sessions.some((s) => s.state === 'open' || s.state === 'full')) || d.days[0])?.date || '');
  });
  useEffect(() => { load().catch(() => {}); }, [masterId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.days.length === 0) return null;
  const day: ClassDay = data.days.find((d) => d.date === date) || data.days[0];
  const mine = day.sessions.find((s) => s.my === 'active' && s.state !== 'closed');

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      tg()?.HapticFeedback?.notificationOccurred('success');
    } catch (e: any) {
      tell(lang === 'ru' && e?.message ? e.message : t('gc_err'));
    }
    await load().catch(() => {});
    setBusy(false);
  };

  const join = (s: ClassSession) => run(async () => {
    const r = await classSignup(s.group, day.date);
    if (r.status === 'waiting') tell(t('gc_wait_done'));
    askWriteAccess();
  });
  const leave = async (s: ClassSession) => {
    if (await ask(t('gc_leave_q'))) run(() => classLeave(s.group, day.date));
  };
  const subscribe = () => run(async () => {
    const on = !data.subscribed;
    const allowed = !on || await askWriteAccess();
    await classSubscribe(masterId, on);
    if (!allowed) tell(t('gc_no_write'));
  });

  const place = (s: ClassSession) => {
    if (s.state === 'canceled') return <Badge tone="off">{t('gc_canceled')}</Badge>;
    if (s.state === 'closed') return <Badge tone="off">{t('gc_closed')}</Badge>;
    if (s.capacity == null) return <Badge tone="ok">{t('gc_free')}</Badge>;
    const left = Math.max(0, s.capacity - s.taken);
    if (!left) return <Badge tone="wait">{t('gc_full')}</Badge>;
    return <Badge tone={left <= 3 ? 'wait' : 'ok'}>{fill(t('gc_left'), { n: left, max: s.capacity })}</Badge>;
  };

  return (
    <div id="classes">
      <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 4px 10px' }}>{t('gc_title')}</div>

      <div style={{ ...card, marginBottom: 8 }}>
        <PrimaryButton variant={data.subscribed ? 'soft' : 'primary'} onClick={subscribe} disabled={busy}>
          {t(data.subscribed ? 'gc_subscribed' : 'gc_subscribe')}
        </PrimaryButton>
        <div style={{ ...hint, marginTop: 8, textAlign: 'center' }}>{t('gc_sub_hint')}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0 10px' }}>
        {data.days.map((d) => (
          <Chip key={d.date} active={d.date === day.date} onClick={() => { tg()?.HapticFeedback?.selectionChanged(); setDate(d.date); }}>
            {dayLabel(d.date, locale, { weekday: 'short', day: 'numeric' })}
          </Chip>
        ))}
      </div>

      {day.program && (
        <div style={{
          ...card, marginBottom: 8, boxShadow: 'none',
          backgroundColor: day.program.special ? 'var(--brand-accent, #50C878)' : 'var(--brand-soft)',
          color: day.program.special ? 'var(--brand-on-accent, #14261B)' : 'var(--brand-ink)',
        }}>
          <div style={{ fontSize: 13 }}>{t('gc_program')}</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{day.program.special ? '✨ ' : ''}{day.program.title}</div>
          {day.program.description && <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{day.program.description}</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {day.sessions.map((s) => {
          const can = s.state === 'open' || s.state === 'full';
          return (
            <div key={s.group} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, textDecoration: s.state === 'canceled' ? 'line-through' : 'none' }}>{tashkent.time(s.start)}</div>
                  <div style={hint}>{s.name} · {s.duration} {t('gc_min')}{s.price ? ` · ${money(s.price)}` : ''}</div>
                  {s.address && <div style={hint}>📍 {s.address}</div>}
                  <div style={{ marginTop: 6 }}>{place(s)}</div>
                </div>
                {!s.my && can && (
                  <div style={{ flex: '0 0 auto' }}>
                    {mine && s.state === 'open'
                      ? <PrimaryButton variant="soft" disabled={busy} onClick={() => run(() => classMove(mine.group, day.date, s.group))}>{t('gc_move')}</PrimaryButton>
                      : <PrimaryButton variant={s.state === 'full' ? 'soft' : 'primary'} disabled={busy} onClick={() => join(s)}>{t(s.state === 'full' ? 'gc_wait' : 'gc_join')}</PrimaryButton>}
                  </div>
                )}
              </div>
              {s.my && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span style={{ fontWeight: 700 }}>{t(s.my === 'active' ? 'gc_you_in' : 'gc_you_wait')}</span>
                  {can && <button type="button" style={link} disabled={busy} onClick={() => leave(s)}>{t('gc_leave')}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ ...hint, margin: '8px 4px' }}>{fill(t('gc_cutoff'), { n: Math.max(...day.sessions.map((s) => s.cutoff_minutes)) })}</div>

      {data.days.some((d) => d.program) && (
        <div style={card}>
          <button type="button" style={link} aria-expanded={month} onClick={() => setMonth((v) => !v)}>{t(month ? 'gc_hide' : 'gc_month')}</button>
          {month && data.days.filter((d) => d.program).map((d) => (
            <div key={d.date} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 15 }}>
              <span style={{ flex: '0 0 110px', color: 'var(--tg-theme-hint-color)' }}>{dayLabel(d.date, locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span style={{ fontWeight: d.program!.rule ? 700 : 400 }}>{d.program!.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
