import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Title, Text, Button, Spinner } from '@telegram-apps/telegram-ui';

import {
  fetchCustomer, saveCustomerNote, fetchSlotsForService, createManualBooking, CustomerDetail, Slot,
} from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';

type Props = {
  clientKey: string;
  onBack: () => void;
};

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const STATUS_COLOR: Record<string, string> = { confirmed: '#50C878', pending: '#FF9500', rejected: '#8E8E93' };

const tzParts = (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' });

export const MasterClientDetailScreen: React.FC<Props> = ({ clientKey, onBack }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t, lang } = useLanguage();
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU';

  const [c, setC] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [rebook, setRebook] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = () => (rebook ? setRebook(false) : onBack());
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  const load = () => fetchCustomer(clientKey)
    .then((d) => { setC(d); setNote(d.note); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, [clientKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (m: string) => (tg?.showAlert ? tg.showAlert(m) : alert(m));
  const fmt = (iso: string | null, withTime = false) => iso
    ? new Date(iso).toLocaleString(locale, {
      day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
    : '—';

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Konnektik mood="think" size={120} />
        <Text style={{ marginTop: 12, color: 'var(--tg-theme-hint-color)' }}>{error}</Text>
      </div>
    );
  }
  if (!c) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }

  const onSaveNote = async () => {
    setSavingNote(true);
    try {
      await saveCustomerNote(c.key, note);
      setC({ ...c, note });
      tg?.HapticFeedback?.notificationOccurred('success');
    } catch (e: any) { say(e.message); } finally { setSavingNote(false); }
  };

  const stats = [
    { label: t('cl_stat_visits'), value: String(c.visits) },
    { label: t('cl_stat_spent'), value: c.spent ? `${c.spent.toLocaleString('ru-RU')}` : '0' },
    { label: t('cl_stat_cancelled'), value: String(c.cancelled) },
    { label: t('cl_stat_next'), value: c.next_visit ? fmt(c.next_visit) : '—' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '22px 16px 12px' }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, backgroundColor: 'var(--tg-theme-bg-color)' }}>
          {c.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <Title level="2" weight="1">{c.name}</Title>
          <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
            {c.first_visit ? fill(t('cl_since'), { date: fmt(c.first_visit) }) : t('cl_new_client')}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
        {/* Связь */}
        {(c.phone || c.username) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {c.phone && (
              <a href={`tel:${c.phone}`} style={{ ...card, flex: 1, textDecoration: 'none', color: 'var(--tg-theme-link-color)', fontWeight: 600, textAlign: 'center' }}>
                📞 {c.phone}
              </a>
            )}
            {c.username && (
              <a href={`https://t.me/${c.username}`} target="_blank" rel="noreferrer"
                style={{ ...card, flex: 1, textDecoration: 'none', color: 'var(--tg-theme-link-color)', fontWeight: 600, textAlign: 'center' }}>
                ✈️ @{c.username}
              </a>
            )}
          </div>
        )}

        {/* Цифры */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Записать снова */}
        {c.last_service_id && (
          <Button size="l" mode="filled" stretched onClick={() => setRebook(true)}>
            {fill(t('cl_rebook'), { service: c.last_service })}
          </Button>
        )}

        {/* Заметка */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('cl_note')}</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('cl_note_ph')}
            aria-label={t('cl_note')}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 10, borderRadius: 10, border: 'none', fontSize: 15,
              backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{t('cl_note_shared')}</Text>
            <Button size="s" mode="bezeled" loading={savingNote} disabled={note === c.note} onClick={onSaveNote}>
              {t('cl_note_save')}
            </Button>
          </div>
        </div>

        {/* История */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('cl_history')}</div>
          {c.history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{h.service}</div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{fmt(h.time, true)} · {h.master}</div>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[h.status] ?? 'inherit' }}>{t(`cl_status_${h.status}`)}</div>
                {h.price ? <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{h.price.toLocaleString('ru-RU')}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {rebook && c.last_service_id && (
        <RebookSheet
          client={c}
          onClose={() => setRebook(false)}
          onDone={(when) => {
            setRebook(false);
            say(fill(t('cl_rebook_done'), { name: c.name, when }));
            load();
          }}
          say={say}
        />
      )}
    </div>
  );
};

// ---------- «Записать снова»: та же услуга у того же мастера ----------

const RebookSheet: React.FC<{
  client: CustomerDetail;
  onClose: () => void;
  onDone: (when: string) => void;
  say: (m: string) => void;
}> = ({ client, onClose, onDone, say }) => {
  const { t, lang } = useLanguage();
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU';
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSlotsForService(client.last_service_id as number).then((list) => {
      const free = list.filter((s) => !s.is_booked);
      setSlots(free);
      setDate(free.length ? tzParts(free[0].time).slice(0, 10) : null);
    }).catch(() => setSlots([]));
  }, [client.last_service_id]);

  const byDate = useMemo(() => {
    const g: Record<string, Slot[]> = {};
    (slots || []).forEach((s) => { (g[tzParts(s.time).slice(0, 10)] ||= []).push(s); });
    return g;
  }, [slots]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await createManualBooking(
        picked.id != null ? picked.id : { serviceId: client.last_service_id as number, time: picked.time },
        '', '', client.key,
      );
      onDone(new Date(picked.time).toLocaleString(locale, {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent',
      }));
    } catch (e: any) { say(e.message); } finally { setBusy(false); }
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
    backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
    color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
  });

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '85vh', overflowY: 'auto',
        backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.15)', color: 'var(--tg-theme-text-color)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{client.name} · {client.last_master}</div>
        <Title level="2" weight="1" style={{ margin: '4px 0 12px' }}>{client.last_service}</Title>

        {slots === null ? <Spinner size="m" /> : slots.length === 0 ? (
          <Text style={{ color: 'var(--tg-theme-hint-color)' }}>{t('cl_rebook_no_times')}</Text>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
              {Object.keys(byDate).slice(0, 14).map((d) => (
                <button key={d} type="button" style={{ ...chip(d === date), flex: '0 0 auto' }} onClick={() => { setDate(d); setPicked(null); }}>
                  {new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {(date ? byDate[date] : []).map((s) => (
                <button key={s.id ?? s.time} type="button" style={chip(picked?.time === s.time)} onClick={() => setPicked(s)}>
                  {tzParts(s.time).slice(11, 16)}
                </button>
              ))}
            </div>
            <Button size="l" mode="filled" stretched disabled={!picked} loading={busy} onClick={submit}>
              {picked ? fill(t('cal_book_at'), { time: tzParts(picked.time).slice(11, 16) }) : t('cal_pick_time')}
            </Button>
            <Text style={{ display: 'block', fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
              {client.telegram_id ? t('cl_rebook_notify') : t('cl_rebook_no_tg')}
            </Text>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <Button size="m" mode="plain" stretched onClick={onClose}>{t('cal_close')}</Button>
        </div>
      </div>
    </>
  );
};
