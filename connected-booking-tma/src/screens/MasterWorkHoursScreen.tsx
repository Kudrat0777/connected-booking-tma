import React, { useEffect, useRef, useState } from 'react';
import { Title, Text, Button, Spinner, Input, Select } from '@telegram-apps/telegram-ui';

import {
  fetchSchedule, saveSchedule, addTimeOff, deleteTimeOff, MasterSchedule, ScheduleDay,
} from '../helpers/api';
import { Konnektik } from '../components/Konnektik';

type Props = {
  /** Чей график: не указан — свой; иначе мастер команды (для владельца/админа) */
  masterId?: number | null;
  onBack: () => void;
};

const DAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const timeInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '10px 8px',
  borderRadius: 10,
  border: '1px solid var(--tg-theme-secondary-bg-color)',
  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
  color: 'var(--tg-theme-text-color)',
  fontSize: 16,
  fontWeight: 600,
  textAlign: 'center',
  fontFamily: 'inherit',
};

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'none',
  padding: '4px 0',
  color: 'var(--tg-theme-link-color, var(--tg-theme-button-color))',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    style={{
      width: 50, height: 30, borderRadius: 15, border: 'none', padding: 3, cursor: 'pointer', flex: '0 0 auto',
      backgroundColor: on ? '#50C878' : 'var(--tg-theme-hint-color)',
      opacity: on ? 1 : 0.45, transition: 'background-color .15s ease',
    }}
  >
    <span style={{
      display: 'block', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
      transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .15s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    }} />
  </button>
);

const EMPTY_DAY = (weekday: number): ScheduleDay => ({
  weekday, is_working: weekday < 5, start: '10:00', end: '19:00', break_start: '', break_end: '',
});

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export const MasterWorkHoursScreen: React.FC<Props> = ({ masterId, onBack }) => {
  const tg = (window as any).Telegram?.WebApp;
  const [data, setData] = useState<MasterSchedule | null>(null);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [step, setStep] = useState(30);
  const [horizon, setHorizon] = useState(30);
  const [lead, setLead] = useState(60);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const [offFrom, setOffFrom] = useState(todayIso());
  const [offTo, setOffTo] = useState(todayIso());
  const [offNote, setOffNote] = useState('');

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  const apply = (s: MasterSchedule) => {
    setData(s);
    // Если график ещё не настраивали — предлагаем Пн–Пт 10:00–19:00
    setDays(s.uses_schedule
      ? s.days.map((d) => ({ ...EMPTY_DAY(d.weekday), ...d, start: d.start || '10:00', end: d.end || '19:00' }))
      : s.days.map((d) => EMPTY_DAY(d.weekday)));
    setStep(s.slot_step);
    setHorizon(s.booking_horizon_days);
    setLead(s.min_lead_minutes);
    setDirty(!s.uses_schedule);
  };

  useEffect(() => {
    fetchSchedule(masterId).then(apply).catch((e) => setError(e.message));
  }, [masterId]);

  const say = (msg: string) => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
  const haptic = (t: 'light' | 'success' | 'error' = 'light') => {
    if (!tg?.HapticFeedback) return;
    if (t === 'light') tg.HapticFeedback.selectionChanged();
    else tg.HapticFeedback.notificationOccurred(t);
  };

  const patchDay = (wd: number, patch: Partial<ScheduleDay>) => {
    setDays((prev) => prev.map((d) => (d.weekday === wd ? { ...d, ...patch } : d)));
    setDirty(true);
  };

  const copyToWorkingDays = (from: ScheduleDay) => {
    haptic();
    setDays((prev) => prev.map((d) => (d.is_working ? { ...from, weekday: d.weekday, is_working: true } : d)));
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveSchedule({ slot_step: step, booking_horizon_days: horizon, min_lead_minutes: lead, days }, masterId);
      apply(res);
      setDirty(false);
      haptic('success');
      say(res.uses_schedule
        ? 'График сохранён. Клиенты видят свободное время автоматически.'
        : 'График сохранён. Отметьте хотя бы один рабочий день, чтобы открыть запись.');
    } catch (e: any) {
      haptic('error');
      say(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onAddOff = async () => {
    try {
      const res = await addTimeOff({ start_date: offFrom, end_date: offTo, note: offNote }, masterId);
      setData(res);
      setOffNote('');
      haptic('success');
      if (res.clashing_bookings) {
        say(`На эти дни уже есть записи: ${res.clashing_bookings}. Новые записи закрыты, существующие перенесите или отмените вручную.`);
      }
    } catch (e: any) { haptic('error'); say(e.message); }
  };

  const onDeleteOff = async (id: number) => {
    try {
      await deleteTimeOff(id);
      setData(await fetchSchedule(masterId));
    } catch (e: any) { say(e.message); }
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="think" size={140} />
        <Text style={{ marginTop: 16, color: 'var(--tg-theme-hint-color)' }}>{error}</Text>
      </div>
    );
  }
  if (!data) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }

  const workingCount = days.filter((d) => d.is_working).length;
  const firstWorking = days.find((d) => d.is_working);

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 110, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 8px' }}>
        <Konnektik mood="explain" size={84} />
        <div>
          <Title level="2" weight="1" style={{ marginBottom: 4 }}>
            {masterId ? `График: ${data.master_name}` : 'Рабочий график'}
          </Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, lineHeight: 1.35 }}>
            Укажите, когда вы работаете. Свободное время для записи посчитается само — с учётом длительности услуг и уже занятых окон.
          </Text>
        </div>
      </div>

      {!data.uses_schedule && (
        <div style={{ margin: '8px 16px', padding: 12, borderRadius: 12, backgroundColor: 'rgba(80, 200, 120, 0.12)', fontSize: 14, lineHeight: 1.4 }}>
          Сейчас клиенты видят только слоты, созданные вручную. После сохранения графика запись будет считаться автоматически.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px' }}>
        {days.map((d) => (
          <div key={d.weekday} style={{ ...card, opacity: d.is_working ? 1 : 0.75 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{DAY_FULL[d.weekday]}</div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                  {d.is_working
                    ? `${d.start}–${d.end}${d.break_start ? `, перерыв ${d.break_start}–${d.break_end}` : ''}`
                    : 'Выходной'}
                </div>
              </div>
              <Toggle
                on={d.is_working}
                label={`${DAY_FULL[d.weekday]}: рабочий день`}
                onChange={(v) => { haptic(); patchDay(d.weekday, { is_working: v }); }}
              />
            </div>

            {d.is_working && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="time" aria-label="Начало работы" value={d.start} style={timeInput}
                    onChange={(e) => patchDay(d.weekday, { start: e.target.value })} />
                  <span style={{ color: 'var(--tg-theme-hint-color)' }}>—</span>
                  <input type="time" aria-label="Конец работы" value={d.end} style={timeInput}
                    onChange={(e) => patchDay(d.weekday, { end: e.target.value })} />
                </div>

                {d.break_start && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', width: 60 }}>Перерыв</span>
                    <input type="time" aria-label="Начало перерыва" value={d.break_start} style={timeInput}
                      onChange={(e) => patchDay(d.weekday, { break_start: e.target.value })} />
                    <span style={{ color: 'var(--tg-theme-hint-color)' }}>—</span>
                    <input type="time" aria-label="Конец перерыва" value={d.break_end} style={timeInput}
                      onChange={(e) => patchDay(d.weekday, { break_end: e.target.value })} />
                    <button type="button" aria-label="Убрать перерыв" onClick={() => patchDay(d.weekday, { break_start: '', break_end: '' })}
                      style={{ border: 'none', background: 'none', color: 'var(--tg-theme-hint-color)', fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {!d.break_start && (
                    <button type="button" style={linkBtn} onClick={() => patchDay(d.weekday, { break_start: '13:00', break_end: '14:00' })}>
                      + Перерыв
                    </button>
                  )}
                  {workingCount > 1 && (
                    <button type="button" style={linkBtn} onClick={() => copyToWorkingDays(d)}>
                      Так же во все рабочие дни
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Настройки записи</div>
          <Select header="Клиент может записаться с шагом" value={String(step)} onChange={(e) => { setStep(Number(e.target.value)); setDirty(true); }}>
            {[15, 20, 30, 45, 60, 90, 120].map((v) => <option key={v} value={v}>каждые {v} мин</option>)}
          </Select>
          <Select header="Запись открыта вперёд на" value={String(horizon)} onChange={(e) => { setHorizon(Number(e.target.value)); setDirty(true); }}>
            {[7, 14, 30, 60, 90].map((v) => <option key={v} value={v}>{v} дней</option>)}
          </Select>
          <Select header="Не раньше чем за" value={String(lead)} onChange={(e) => { setLead(Number(e.target.value)); setDirty(true); }}>
            <option value="0">без ограничения</option>
            <option value="30">30 минут</option>
            <option value="60">1 час</option>
            <option value="120">2 часа</option>
            <option value="180">3 часа</option>
            <option value="1440">1 день</option>
          </Select>
          <Text style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 8, lineHeight: 1.4 }}>
            Шаг — как часто начинаются окна: при шаге 30 минут клиент видит 10:00, 10:30, 11:00… Длительность берётся из услуги.
          </Text>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Выходные и отпуск</div>
          <Text style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 10 }}>
            В эти дни запись будет закрыта.
          </Text>
          {data.time_off.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {o.start_date === o.end_date ? fmtDate(o.start_date) : `${fmtDate(o.start_date)} — ${fmtDate(o.end_date)}`}
                </div>
                {o.note && <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{o.note}</div>}
              </div>
              <Button size="s" mode="plain" onClick={() => onDeleteOff(o.id)}>
                <span style={{ color: 'var(--tg-theme-destructive-text-color, #FF3B30)' }}>Удалить</span>
              </Button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input header="С" type="date" value={offFrom} min={todayIso()}
              onChange={(e) => { setOffFrom(e.target.value); if (e.target.value > offTo) setOffTo(e.target.value); }} />
            <Input header="По" type="date" value={offTo} min={offFrom} onChange={(e) => setOffTo(e.target.value)} />
          </div>
          <Input header="Комментарий" placeholder="Например: отпуск" value={offNote} onChange={(e) => setOffNote(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            <Button size="m" mode="bezeled" stretched onClick={onAddOff}>Добавить выходные</Button>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        <Button size="l" stretched mode="filled" loading={saving} disabled={!dirty && data.uses_schedule} onClick={onSave}>
          {dirty || !data.uses_schedule ? 'Сохранить график' : 'График сохранён'}
        </Button>
        {!firstWorking && (
          <Text style={{ display: 'block', textAlign: 'center', fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 6 }}>
            Все дни выходные — клиенты не смогут записаться
          </Text>
        )}
      </div>
    </div>
  );
};
