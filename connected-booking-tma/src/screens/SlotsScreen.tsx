import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import type { Booking, MasterPublicProfile, Service, Slot } from '../helpers/api';
import { createBooking, fetchMasterById, fetchSlotsForService } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Chip, PrimaryButton, Sheet, card, localeFor, money, tashkent } from '../components/ui';
import { useWhen } from './ClientHomeScreen';

type Props = {
  service: Service;
  onBack: () => void;
  /** Запись создана — показать экран «Вы записаны» */
  onBooked?: (booking: Booking) => void;
  /** Старый сценарий (отдельный экран подтверждения) — если onBooked не передан */
  onSlotSelected?: (slot: Slot) => void;
  user?: { id?: number; username?: string; photo_url?: string } | null;
};

type Part = 'morning' | 'day' | 'evening';
const partOf = (hhmm: string): Part => {
  const h = Number(hhmm.slice(0, 2));
  return h < 12 ? 'morning' : h < 17 ? 'day' : 'evening';
};

export const SlotsScreen: React.FC<Props> = ({ service, onBack, onBooked, onSlotSelected, user }) => {
  const { t, lang } = useLanguage();
  const when = useWhen();
  const tg = (window as any).Telegram?.WebApp;

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [booking, setBooking] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = () => (picked ? setPicked(null) : onBack());
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    tg.MainButton?.hide();
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  const load = () => {
    setError(false);
    setSlots(null);
    fetchSlotsForService(service.id)
      .then((data) => {
        const free = data.filter((s) => !s.is_booked);
        setSlots(free);
        setDate((d) => (d && free.some((s) => tashkent.date(s.time) === d) ? d : free.length ? tashkent.date(free[0].time) : null));
      })
      .catch(() => setError(true));
  };
  useEffect(load, [service.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMasterById(service.master).then(setMaster).catch(() => {}); }, [service.master]);

  const byDate = useMemo(() => {
    const g: Record<string, Slot[]> = {};
    (slots || []).forEach((s) => { (g[tashkent.date(s.time)] ||= []).push(s); });
    return g;
  }, [slots]);
  const dates = Object.keys(byDate).sort();

  const parts = useMemo(() => {
    const res: Record<Part, Slot[]> = { morning: [], day: [], evening: [] };
    (date ? byDate[date] || [] : []).forEach((s) => res[partOf(tashkent.time(s.time))].push(s));
    return res;
  }, [date, byDate]);

  const confirm = async () => {
    if (!picked) return;
    if (!onBooked) { onSlotSelected?.(picked); return; }
    setBooking(true);
    try {
      const res = await createBooking({
        name: service.name,
        slot_id: picked.id,
        service_id: service.id,
        time: picked.time,
        telegram_id: user?.id,
        username: user?.username,
        photo_url: user?.photo_url,
      });
      tg?.HapticFeedback?.notificationOccurred('success');
      onBooked(res);
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred('error');
      const msg = e?.message && !String(e.message).startsWith('Failed') ? e.message : t('error_slot_taken');
      if (tg?.showAlert) tg.showAlert(msg); else alert(msg);
      setPicked(null);
      load(); // время могли занять — показываем актуальное
    } finally {
      setBooking(false);
    }
  };

  const locale = localeFor(lang);
  const masterName = service.master_name || master?.name || '';

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      {/* Что и у кого — одной карточкой */}
      <div style={{ ...card, margin: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar src={master?.avatar_url} name={masterName || '?'} size={48} radius={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{service.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
            {[masterName, service.duration ? `${service.duration} ${t('min')}` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        {service.price ? <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{money(service.price)}</div> : null}
      </div>

      {error ? (
        <div style={{ ...card, margin: 16, textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>{t('error_load_slots')}</div>
          <PrimaryButton variant="soft" onClick={load}>{t('retry')}</PrimaryButton>
        </div>
      ) : slots === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></div>
      ) : dates.length === 0 ? (
        <div style={{ ...card, margin: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
          <Konnektik mood="think" size={110} />
          <div style={{ fontWeight: 700, marginTop: 10 }}>{t('no_free_time_header')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{t('no_free_time_desc')}</div>
        </div>
      ) : (
        <>
          {/* Даты */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 16px 4px', scrollbarWidth: 'none' }}>
            {dates.map((d) => {
              const dt = new Date(`${d}T12:00:00`);
              const active = d === date;
              const isToday = d === tashkent.today();
              return (
                <button key={d} type="button" onClick={() => { tg?.HapticFeedback?.selectionChanged(); setDate(d); setPicked(null); }}
                  style={{
                    flex: '0 0 auto', width: 58, padding: '8px 0', borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    backgroundColor: active ? 'var(--brand-accent)' : 'var(--tg-theme-bg-color)',
                    color: active ? 'var(--brand-on-accent)' : 'var(--tg-theme-text-color)',
                    boxShadow: active ? '0 4px 12px rgba(80,200,120,0.35)' : '0 1px 2px rgba(0,0,0,0.05)',
                  }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{isToday ? t('cal_today') : dt.toLocaleDateString(locale, { weekday: 'short' })}</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{dt.getDate()}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{byDate[d].length}</div>
                </button>
              );
            })}
          </div>

          {/* Время по частям дня */}
          <div style={{ padding: '8px 16px 0' }}>
            {(['morning', 'day', 'evening'] as Part[]).filter((p) => parts[p].length).map((p) => (
              <div key={p} style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', margin: '0 4px 8px' }}>{t(`sl_${p}`)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8 }}>
                  {parts[p].map((s) => (
                    <Chip key={s.id ?? s.time} active={picked?.time === s.time}
                      onClick={() => { tg?.HapticFeedback?.selectionChanged(); setPicked(s); }}>
                      <span style={{ display: 'block', textAlign: 'center', fontSize: 16 }}>{tashkent.time(s.time)}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Подтверждение — сразу здесь, без отдельного экрана */}
      {picked && (
        <Sheet onClose={() => setPicked(null)}>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{t('sl_check')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{when(picked.time)}</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
            <Row label={t('sl_service')} value={`${service.name}${service.duration ? ` · ${service.duration} ${t('min')}` : ''}`} />
            <Row label={t('sl_master')} value={masterName} />
            {service.price ? <Row label={t('sl_price')} value={money(service.price)} /> : null}
            {master?.address && <Row label={t('sl_address')} value={[master.city, master.address].filter(Boolean).join(', ')} />}
          </div>
          <div style={{ marginTop: 18 }}>
            <PrimaryButton loading={booking} onClick={confirm}>{fill(t('sl_confirm'), { time: tashkent.time(picked.time) })}</PrimaryButton>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', textAlign: 'center', marginTop: 10 }}>{t('sl_free_cancel')}</div>
        </Sheet>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ color: 'var(--tg-theme-hint-color)', flex: '0 0 auto' }}>{label}</span>
    <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
  </div>
);
