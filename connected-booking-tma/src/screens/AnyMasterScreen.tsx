import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Title, Text, Button, Spinner } from '@telegram-apps/telegram-ui';

import { fetchSalonServices, fetchAnyMasterTimes, bookAnyMaster, SalonService } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';

type Props = {
  slug: string;
  businessName: string;
  onBack: () => void;
  onDone: () => void; // «К моим записям»
};

type Step = 'service' | 'time' | 'done';

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

// Дата и время по Ташкенту, независимо от часового пояса телефона
const tz = (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' });
const localDate = (iso: string) => tz(iso).slice(0, 10);
const localTime = (iso: string) => tz(iso).slice(11, 16);

const money = (n: number) => n.toLocaleString('ru-RU');

export const AnyMasterScreen: React.FC<Props> = ({ slug, businessName, onBack, onDone }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t, lang } = useLanguage();
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU';

  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<SalonService[] | null>(null);
  const [service, setService] = useState<SalonService | null>(null);
  const [times, setTimes] = useState<{ time: string; masters: number }[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<{ master: string; time: string } | null>(null);

  const backRef = useRef(onBack);
  backRef.current = () => {
    if (step === 'time') { setStep('service'); setPicked(null); }
    else onBack();
  };
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  useEffect(() => { fetchSalonServices(slug).then(setServices); }, [slug]);

  const loadTimes = (svc: SalonService) => {
    setTimes(null);
    setPicked(null);
    fetchAnyMasterTimes(slug, svc.key).then((list) => {
      setTimes(list);
      setDate(list.length ? localDate(list[0].time) : null);
    });
  };

  const byDate = useMemo(() => {
    const groups: Record<string, { time: string; masters: number }[]> = {};
    (times || []).forEach((x) => { (groups[localDate(x.time)] ||= []).push(x); });
    return groups;
  }, [times]);

  const haptic = () => tg?.HapticFeedback?.selectionChanged();
  const say = (m: string) => (tg?.showAlert ? tg.showAlert(m) : alert(m));

  const priceText = (s: SalonService) => {
    if (s.price_min == null) return '';
    return s.price_min === s.price_max ? `${money(s.price_min)} UZS` : `${money(s.price_min)}–${money(s.price_max!)} UZS`;
  };
  const durationText = (s: SalonService) =>
    s.duration_min === s.duration_max ? `${s.duration_min} ${t('min')}` : `${s.duration_min}–${s.duration_max} ${t('min')}`;

  const submit = async () => {
    if (!service || !picked) return;
    setBooking(true);
    try {
      const user = tg?.initDataUnsafe?.user;
      const res = await bookAnyMaster(slug, service.key, picked, user?.username);
      tg?.HapticFeedback?.notificationOccurred('success');
      setResult({ master: res.master.name, time: picked });
      setStep('done');
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred('error');
      say(e.message);
      loadTimes(service); // время могли занять — обновляем список
    } finally {
      setBooking(false);
    }
  };

  const page: React.CSSProperties = {
    backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 110,
    color: 'var(--tg-theme-text-color)',
  };

  // ---------- Готово ----------
  if (step === 'done' && result && service) {
    const d = new Date(result.time);
    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="happy" size={150} />
        <Title level="1" weight="1" style={{ marginTop: 16, marginBottom: 8 }}>{t('any_done_title')}</Title>
        <Text style={{ fontSize: 16, lineHeight: 1.45 }}>
          {fill(t('any_done_desc'), {
            service: service.name,
            master: result.master,
            date: d.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' }),
            time: localTime(result.time),
          })}
        </Text>
        <Text style={{ display: 'block', color: 'var(--tg-theme-hint-color)', marginTop: 8, marginBottom: 24 }}>
          {t('any_done_hint')}
        </Text>
        <div style={{ width: '100%', maxWidth: 360, flex: '0 0 auto' }}>
          <Button size="l" mode="filled" stretched onClick={onDone}>{t('any_my_bookings')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 16px 8px' }}>
        <Konnektik mood={step === 'service' ? 'hello' : 'explain'} size={72} />
        <div>
          <Title level="2" weight="1">{t('any_title')}</Title>
          <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
            {step === 'service' ? fill(t('any_subtitle'), { name: businessName }) : service?.name}
          </Text>
        </div>
      </div>

      {/* ---------- Шаг 1: услуга ---------- */}
      {step === 'service' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px' }}>
          {services === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></div>
          ) : services.length === 0 ? (
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Konnektik mood="think" size={70} />
              <Text style={{ color: 'var(--tg-theme-hint-color)' }}>{t('any_no_services')}</Text>
            </div>
          ) : services.map((s) => (
            <button key={s.key} type="button"
              onClick={() => { haptic(); setService(s); setStep('time'); loadTimes(s); }}
              style={{ ...card, border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{priceText(s)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
                {durationText(s)} · {fill(t('any_masters_count'), { n: pluralize(lang, s.masters_count, t('p_masters')) })}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ---------- Шаг 2: дата и время ---------- */}
      {step === 'time' && service && (
        <div style={{ padding: '8px 0' }}>
          {times === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></div>
          ) : times.length === 0 ? (
            <div style={{ ...card, margin: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Konnektik mood="think" size={70} />
              <Text style={{ color: 'var(--tg-theme-hint-color)' }}>{t('any_no_times')}</Text>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px', scrollbarWidth: 'none' }}>
                {Object.keys(byDate).map((d) => {
                  const active = d === date;
                  const dt = new Date(`${d}T12:00:00`);
                  return (
                    <button key={d} type="button" onClick={() => { haptic(); setDate(d); setPicked(null); }}
                      style={{
                        flex: '0 0 auto', width: 56, padding: '8px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
                        color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                      }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{dt.toLocaleDateString(locale, { weekday: 'short' })}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{dt.getDate()}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10, padding: '0 16px' }}>
                {(date ? byDate[date] : []).map((x) => {
                  const active = picked === x.time;
                  return (
                    <button key={x.time} type="button" onClick={() => { haptic(); setPicked(x.time); }}
                      style={{
                        padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
                        color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{localTime(x.time)}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{fill(t('any_free_n'), { n: x.masters })}</div>
                    </button>
                  );
                })}
              </div>
              <Text style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)', padding: '14px 16px 0' }}>
                {t('any_hint')}
              </Text>
            </>
          )}

          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
            <Button size="l" mode="filled" stretched disabled={!picked} loading={booking} onClick={submit}>
              {picked ? fill(t('any_book_at'), { time: localTime(picked) }) : t('cal_pick_time')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
