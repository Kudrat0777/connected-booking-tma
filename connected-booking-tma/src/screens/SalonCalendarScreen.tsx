import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Title, Text, Button, Spinner, Input } from '@telegram-apps/telegram-ui';

import {
  fetchSalonDay, fetchServices, fetchSlotsForService, createManualBooking, confirmBooking, rejectBooking,
  SalonDay, SalonColumn, SalonBooking, Service, Slot,
} from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';

type Props = { onBack: () => void };

const PX_PER_MIN = 1.2;          // 72 px на час
const COL_WIDTH = 150;
const TIME_COL = 46;
const HEADER_H = 52;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Местное время салона (Ташкент), не зависит от часового пояса телефона
const tashkentNow = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

const STATUS_STYLE: Record<string, { bg: string; border: string }> = {
  pending: { bg: 'rgba(255, 149, 0, 0.16)', border: '#FF9500' },
  confirmed: { bg: 'rgba(80, 200, 120, 0.18)', border: '#50C878' },
};

const sheet: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '85vh', overflowY: 'auto',
  backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px',
  boxShadow: '0 -8px 30px rgba(0,0,0,0.15)', color: 'var(--tg-theme-text-color)',
};
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.35)' };

export const SalonCalendarScreen: React.FC<Props> = ({ onBack }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t, lang } = useLanguage();
  const now = tashkentNow();

  const [date, setDate] = useState(now.date);
  const [day, setDay] = useState<SalonDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openBooking, setOpenBooking] = useState<{ master: SalonColumn; booking: SalonBooking } | null>(null);
  const [adding, setAdding] = useState<{ master: SalonColumn; minute: number } | null>(null);

  const backRef = useRef(onBack);
  backRef.current = () => {
    if (openBooking) setOpenBooking(null);
    else if (adding) setAdding(null);
    else onBack();
  };
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  const load = useCallback(() => {
    setLoading(true);
    fetchSalonDay(date)
      .then((d) => { setDay(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);
  useEffect(load, [load]);

  const say = (msg: string) => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
  const haptic = () => tg?.HapticFeedback?.selectionChanged();

  // 14 дней вперёд для ленты дат
  const dates = useMemo(() => {
    const base = new Date(`${now.date}T00:00:00`);
    return Array.from({ length: 14 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d; });
  }, [now.date]);

  // Видимый диапазон часов: по графикам и записям, по умолчанию 09:00–20:00
  const [from, to] = useMemo(() => {
    let lo = 9 * 60, hi = 20 * 60;
    day?.masters.forEach((m) => {
      if (m.working) { lo = Math.min(lo, m.working.start); hi = Math.max(hi, m.working.end); }
      m.bookings.forEach((b) => { lo = Math.min(lo, b.start); hi = Math.max(hi, b.end); });
    });
    return [Math.floor(lo / 60) * 60, Math.ceil(hi / 60) * 60];
  }, [day]);

  const canEdit = (m: SalonColumn) => !!day && (day.can_manage || m.id === day.my_master_id);
  const y = (min: number) => (min - from) * PX_PER_MIN;
  const height = (to - from) * PX_PER_MIN;

  const onColumnTap = (m: SalonColumn, e: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit(m) || m.day_off) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = Math.round((from + (e.clientY - rect.top) / PX_PER_MIN) / 15) * 15;
    haptic();
    setAdding({ master: m, minute });
  };

  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU';

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px 8px' }}>
        <Konnektik mood="explain" size={64} />
        <div style={{ minWidth: 0 }}>
          <Title level="2" weight="1">{t('cal_title')}</Title>
          <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
            {day ? `${day.business} · ${fill(t('cal_summary'), {
              total: pluralize(lang, day.summary.total, t('p_bookings')),
            })}` : ' '}
            {day && day.summary.pending > 0 && (
              <span style={{ color: '#FF9500', fontWeight: 600 }}> · {fill(t('cal_pending'), { n: day.summary.pending })}</span>
            )}
          </Text>
        </div>
      </div>

      {/* Лента дат */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px', scrollbarWidth: 'none' }}>
        {dates.map((d) => {
          const iso = isoDate(d);
          const active = iso === date;
          return (
            <button key={iso} type="button" onClick={() => { haptic(); setDate(iso); }}
              style={{
                flex: '0 0 auto', width: 54, padding: '8px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
                color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)', fontFamily: 'inherit',
              }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {iso === now.date ? t('cal_today') : d.toLocaleDateString(locale, { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, textAlign: 'center' }}>
          <Konnektik mood="think" size={120} />
          <Text style={{ marginTop: 12, color: 'var(--tg-theme-hint-color)' }}>{error}</Text>
        </div>
      ) : !day || (loading && !day) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></div>
      ) : (
        <>
          {day.can_manage && (
            <Text style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)', padding: '0 16px 8px' }}>
              {t('cal_tap_hint')}
            </Text>
          )}
          {/* Сетка: время слева, мастера — колонками с горизонтальной прокруткой */}
          <div style={{ overflowX: 'auto', paddingBottom: 24, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
            <div style={{ display: 'flex', minWidth: TIME_COL + day.masters.length * COL_WIDTH, position: 'relative' }}>
              <div style={{ width: TIME_COL, flex: '0 0 auto', position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                <div style={{ height: HEADER_H }} />
                <div style={{ position: 'relative', height }}>
                  {Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60).map((m) => (
                    <div key={m} style={{ position: 'absolute', top: y(m) - 7, right: 6, fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>
                      {hhmm(m)}
                    </div>
                  ))}
                </div>
              </div>

              {day.masters.map((m) => (
                <div key={m.id} style={{ width: COL_WIDTH, flex: '1 0 auto', minWidth: COL_WIDTH, paddingRight: 6 }}>
                  <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, backgroundColor: 'var(--tg-theme-bg-color)' }}>
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>
                        {m.day_off ? t('wh_day_off') : m.working ? `${hhmm(m.working.start)}–${hhmm(m.working.end)}` : t('cal_manual_slots')}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={(e) => onColumnTap(m, e)}
                    style={{
                      position: 'relative', height, borderRadius: 12, overflow: 'hidden',
                      cursor: canEdit(m) && !m.day_off ? 'pointer' : 'default',
                      // вне рабочих часов — штриховка
                      background: m.working || m.schedule === 'manual'
                        ? 'repeating-linear-gradient(135deg, var(--tg-theme-secondary-bg-color) 0 6px, rgba(127,127,127,0.10) 6px 12px)'
                        : 'repeating-linear-gradient(135deg, var(--tg-theme-secondary-bg-color) 0 6px, rgba(127,127,127,0.16) 6px 12px)',
                    }}
                  >
                    {/* рабочие часы */}
                    {(m.working || (m.schedule === 'manual' && !m.day_off)) && (
                      <div style={{
                        position: 'absolute', left: 0, right: 0, backgroundColor: 'var(--tg-theme-bg-color)',
                        top: m.working ? y(m.working.start) : 0,
                        height: m.working ? (m.working.end - m.working.start) * PX_PER_MIN : height,
                      }} />
                    )}
                    {/* перерыв */}
                    {m.working?.break_start != null && m.working.break_end != null && (
                      <div style={{
                        position: 'absolute', left: 0, right: 0, top: y(m.working.break_start),
                        height: (m.working.break_end - m.working.break_start) * PX_PER_MIN,
                        background: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(127,127,127,0.14) 6px 12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--tg-theme-hint-color)',
                      }}>{t('wh_break')}</div>
                    )}
                    {/* линии часов */}
                    {Array.from({ length: (to - from) / 60 }, (_, i) => from + (i + 1) * 60).map((mm) => (
                      <div key={mm} style={{ position: 'absolute', left: 0, right: 0, top: y(mm), borderTop: '1px solid rgba(127,127,127,0.15)' }} />
                    ))}
                    {/* записи */}
                    {m.bookings.map((b) => {
                      const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.confirmed;
                      const h = Math.max((b.end - b.start) * PX_PER_MIN - 2, 24);
                      return (
                        <button key={b.id} type="button"
                          onClick={(e) => { e.stopPropagation(); haptic(); setOpenBooking({ master: m, booking: b }); }}
                          style={{
                            position: 'absolute', left: 3, right: 3, top: y(b.start) + 1, height: h, padding: '4px 6px',
                            borderRadius: 8, border: 'none', borderLeft: `3px solid ${st.border}`, backgroundColor: st.bg,
                            textAlign: 'left', overflow: 'hidden', cursor: 'pointer', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
                          }}>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{hhmm(b.start)}–{hhmm(b.end)}</div>
                          {h > 34 && <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client_name}</div>}
                          {h > 52 && <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.service}</div>}
                        </button>
                      );
                    })}
                    {/* сейчас */}
                    {date === now.date && now.minutes >= from && now.minutes <= to && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: y(now.minutes), borderTop: '2px solid #FF3B30', pointerEvents: 'none' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {openBooking && day && (
        <BookingSheet
          data={openBooking}
          canEdit={canEdit(openBooking.master)}
          onClose={() => setOpenBooking(null)}
          onChanged={() => { setOpenBooking(null); load(); }}
          say={say}
        />
      )}

      {adding && (
        <AddSheet
          master={adding.master}
          date={date}
          minute={adding.minute}
          onClose={() => setAdding(null)}
          onCreated={() => { setAdding(null); load(); }}
          say={say}
        />
      )}
    </div>
  );
};

// ---------- Карточка записи ----------

const BookingSheet: React.FC<{
  data: { master: SalonColumn; booking: SalonBooking };
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
  say: (m: string) => void;
}> = ({ data, canEdit, onClose, onChanged, say }) => {
  const { t } = useLanguage();
  const { master, booking: b } = data;
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); onChanged(); } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div style={backdrop} onClick={onClose} />
      <div style={sheet} role="dialog" aria-modal="true">
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{master.name}</div>
        <Title level="2" weight="1" style={{ margin: '4px 0 2px' }}>{hhmm(b.start)}–{hhmm(b.end)} · {b.service}</Title>
        <div style={{ fontSize: 16, marginTop: 8 }}>👤 {b.client_name}</div>
        {b.client_phone && (
          <a href={`tel:${b.client_phone}`} style={{ display: 'block', fontSize: 16, marginTop: 6, color: 'var(--tg-theme-link-color)', textDecoration: 'none' }}>
            📞 {b.client_phone}
          </a>
        )}
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: STATUS_STYLE[b.status]?.border }}>
          {b.status === 'pending' ? t('cal_status_pending') : t('cal_status_confirmed')}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            {b.status === 'pending' && (
              <Button size="m" mode="filled" stretched loading={busy} onClick={() => run(() => confirmBooking(b.id))}>
                {t('cal_confirm')}
              </Button>
            )}
            <Button size="m" mode="bezeled" stretched disabled={busy} onClick={() => run(() => rejectBooking(b.id))}>
              <span style={{ color: 'var(--tg-theme-destructive-text-color, #FF3B30)' }}>
                {b.status === 'pending' ? t('cal_reject') : t('cal_cancel')}
              </span>
            </Button>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <Button size="m" mode="plain" stretched onClick={onClose}>{t('cal_close')}</Button>
        </div>
      </div>
    </>
  );
};

// ---------- Новая запись ----------

const AddSheet: React.FC<{
  master: SalonColumn;
  date: string;
  minute: number;
  onClose: () => void;
  onCreated: () => void;
  say: (m: string) => void;
}> = ({ master, date, minute, onClose, onCreated, say }) => {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[] | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [times, setTimes] = useState<Slot[] | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  // Минуты от полуночи по Ташкенту для ISO-времени слота
  const localMinutes = (iso: string) => {
    const [, time] = new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).split(' ');
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const localDate = (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10);

  useEffect(() => {
    fetchServices(master.id).then((list) => {
      setServices(list);
      if (list.length === 1) setServiceId(list[0].id);
    }).catch(() => setServices([]));
  }, [master.id]);

  useEffect(() => {
    if (!serviceId) return;
    setTimes(null);
    setPicked(null);
    fetchSlotsForService(serviceId).then((all) => {
      const today = all.filter((s) => !s.is_booked && localDate(s.time) === date);
      setTimes(today);
      // выбираем ближайшее время к месту нажатия
      const best = today.reduce<Slot | null>((acc, s) => {
        const d = Math.abs(localMinutes(s.time) - minute);
        return !acc || d < Math.abs(localMinutes(acc.time) - minute) ? s : acc;
      }, null);
      setPicked(best);
    }).catch(() => setTimes([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date]);

  const submit = async () => {
    if (!picked || !name.trim() || !phone.trim()) { say(t('cal_fill_all')); return; }
    setBusy(true);
    try {
      await createManualBooking(
        picked.id != null ? picked.id : { serviceId: serviceId as number, time: picked.time },
        name.trim(), phone.trim(),
      );
      onCreated();
    } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
    backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
    color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
  });

  return (
    <>
      <div style={backdrop} onClick={onClose} />
      <div style={sheet} role="dialog" aria-modal="true">
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{master.name}</div>
        <Title level="2" weight="1" style={{ margin: '4px 0 12px' }}>{t('cal_new_booking')}</Title>

        {services === null ? <Spinner size="m" /> : services.length === 0 ? (
          <Text style={{ color: 'var(--tg-theme-hint-color)' }}>{t('cal_no_services')}</Text>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>{t('cal_service')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {services.map((s) => (
                <button key={s.id} type="button" style={chip(serviceId === s.id)} onClick={() => setServiceId(s.id)}>
                  {s.name}{s.duration ? ` · ${s.duration}′` : ''}
                </button>
              ))}
            </div>

            {serviceId && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>{t('cal_time')}</div>
                {times === null ? <Spinner size="s" /> : times.length === 0 ? (
                  <Text style={{ display: 'block', color: 'var(--tg-theme-hint-color)', marginBottom: 12 }}>{t('cal_no_times')}</Text>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {times.map((s) => (
                      <button key={s.id ?? s.time} type="button" style={chip(picked?.time === s.time)} onClick={() => setPicked(s)}>
                        {hhmm(localMinutes(s.time))}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <Input header={t('cal_client_name')} value={name} onChange={(e) => setName(e.target.value)} />
            <Input header={t('reg_phone')} type="tel" placeholder="+998 90 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div style={{ marginTop: 12 }}>
              <Button size="l" mode="filled" stretched loading={busy} disabled={!picked} onClick={submit}>
                {picked ? fill(t('cal_book_at'), { time: hhmm(localMinutes(picked.time)) }) : t('cal_pick_time')}
              </Button>
            </div>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <Button size="m" mode="plain" stretched onClick={onClose}>{t('cal_close')}</Button>
        </div>
      </div>
    </>
  );
};
