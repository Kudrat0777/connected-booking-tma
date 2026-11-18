// Панели снизу для кабинета мастера: ручная запись клиента и создание/изменение услуги.
import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import {
  createManualBooking, createServiceByMaster, deleteService, fetchSlotsForService, updateService,
  Service, Slot,
} from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Chip, PrimaryButton, Sheet, localeFor, money, tashkent } from './ui';

const tg = () => (window as any).Telegram?.WebApp;
const say = (m: string) => (tg()?.showAlert ? tg().showAlert(m) : alert(m));
const confirmAsk = (m: string) => new Promise<boolean>((resolve) => {
  if (tg()?.showConfirm) tg().showConfirm(m, (ok: boolean) => resolve(ok));
  else resolve(window.confirm(m));
});

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: 'none', fontSize: 16,
  backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', margin: '14px 2px 6px' };

// ---------- Ручная запись: услуга → день → время → клиент ----------

export const ManualBookingSheet: React.FC<{
  services: Service[];
  onClose: () => void;
  onCreated: (result: { isNewClient: boolean; name: string }) => void;
}> = ({ services, onClose, onCreated }) => {
  const { t, lang } = useLanguage();
  const [service, setService] = useState<Service | null>(services.length === 1 ? services[0] : null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!service) return;
    setSlots(null); setPicked(null);
    fetchSlotsForService(service.id).then((list) => {
      const free = list.filter((s) => !s.is_booked);
      setSlots(free);
      setDate(free.length ? tashkent.date(free[0].time) : null);
    }).catch(() => setSlots([]));
  }, [service]);

  const byDate = useMemo(() => {
    const g: Record<string, Slot[]> = {};
    (slots || []).forEach((s) => { (g[tashkent.date(s.time)] ||= []).push(s); });
    return g;
  }, [slots]);

  const submit = async () => {
    if (!service || !picked || !name.trim() || !phone.trim()) { say(t('cal_fill_all')); return; }
    setBusy(true);
    try {
      const res = await createManualBooking(
        picked.id != null ? picked.id : { serviceId: service.id, time: picked.time }, name.trim(), phone.trim());
      tg()?.HapticFeedback?.notificationOccurred('success');
      onCreated({ isNewClient: !!res.is_new_client, name: name.trim() });
    } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{t('cal_new_booking')}</div>

      <div style={label}>{t('cal_service')}</div>
      {services.length === 0 ? (
        <div style={{ color: 'var(--tg-theme-hint-color)' }}>{t('cal_no_services')}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {services.map((s) => (
            <Chip key={s.id} active={service?.id === s.id} onClick={() => setService(s)}>
              {s.name}{s.duration ? ` · ${s.duration}′` : ''}
            </Chip>
          ))}
        </div>
      )}

      {service && (
        slots === null ? <div style={{ padding: 16, textAlign: 'center' }}><Spinner size="s" /></div> :
        slots.length === 0 ? <div style={{ ...label, fontWeight: 400 }}>{t('cl_rebook_no_times')}</div> : (
          <>
            <div style={label}>{t('cal_time')}</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
              {Object.keys(byDate).slice(0, 14).map((d) => (
                <Chip key={d} active={d === date} onClick={() => { setDate(d); setPicked(null); }}>
                  {d === tashkent.today() ? t('cal_today') : new Date(`${d}T12:00:00`).toLocaleDateString(localeFor(lang), { weekday: 'short', day: 'numeric' })}
                </Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(date ? byDate[date] : []).map((s) => (
                <Chip key={s.id ?? s.time} active={picked?.time === s.time} onClick={() => setPicked(s)}>
                  {tashkent.time(s.time)}
                </Chip>
              ))}
            </div>
          </>
        )
      )}

      <div style={label}>{t('cal_client_name')}</div>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} aria-label={t('cal_client_name')} />
      <div style={label}>{t('reg_phone')}</div>
      <input style={field} type="tel" placeholder="+998 90 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label={t('reg_phone')} />

      <div style={{ marginTop: 18 }}>
        <PrimaryButton disabled={!picked} loading={busy} onClick={submit}>
          {picked ? fill(t('cal_book_at'), { time: tashkent.time(picked.time) }) : t('cal_pick_time')}
        </PrimaryButton>
      </div>
    </Sheet>
  );
};

// ---------- Услуга: создать или изменить ----------

export const ServiceSheet: React.FC<{
  telegramId: number;
  service: Service | null;       // null — новая услуга
  onClose: () => void;
  onSaved: () => void;
}> = ({ telegramId, service, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(service?.name ?? '');
  const [price, setPrice] = useState(service?.price != null ? String(service.price) : '');
  const [duration, setDuration] = useState(service?.duration != null ? String(service.duration) : '60');
  const [description, setDescription] = useState(service?.description ?? '');
  const [busy, setBusy] = useState(false);

  const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

  const save = async () => {
    if (!name.trim()) { say(t('ms_name_required')); return; }
    const p = price.trim() ? Number(price.replace(/\s/g, '')) : null;
    const d = duration ? Number(duration) : null;
    if ((p != null && (!Number.isFinite(p) || p < 0)) || (d != null && (!Number.isFinite(d) || d <= 0))) {
      say(t('ms_numbers')); return;
    }
    setBusy(true);
    try {
      if (service) await updateService(service.id, { name: name.trim(), price: p, duration: d, description: description.trim() });
      else await createServiceByMaster(telegramId, name.trim(), p ?? 0, d ?? 60, description.trim());
      tg()?.HapticFeedback?.notificationOccurred('success');
      onSaved();
    } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!service || !(await confirmAsk(fill(t('ms_delete_confirm'), { name: service.name })))) return;
    setBusy(true);
    try { await deleteService(service.id); onSaved(); } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{service ? t('ms_edit_title') : t('ms_new_title')}</div>

      <div style={label}>{t('ms_name')}</div>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ms_name_ph')} aria-label={t('ms_name')} />

      <div style={label}>{t('ms_price')}</div>
      <input style={field} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d\s]/g, ''))}
        placeholder="100 000" aria-label={t('ms_price')} />
      {price && <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '4px 2px 0' }}>{money(Number(price.replace(/\s/g, '')) || 0)}</div>}

      <div style={label}>{t('ms_duration')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DURATIONS.map((m) => (
          <Chip key={m} active={duration === String(m)} onClick={() => setDuration(String(m))}>
            {m < 60 ? `${m} ${t('min')}` : `${m / 60} ${t('ms_hour')}`}
          </Chip>
        ))}
      </div>

      <div style={label}>{t('ms_description')}</div>
      <textarea style={{ ...field, resize: 'vertical' }} rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder={t('ms_description_ph')} aria-label={t('ms_description')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <PrimaryButton loading={busy} onClick={save}>{t('ms_save')}</PrimaryButton>
        {service && <PrimaryButton variant="danger" onClick={remove}>{t('ms_delete')}</PrimaryButton>}
      </div>
    </Sheet>
  );
};
