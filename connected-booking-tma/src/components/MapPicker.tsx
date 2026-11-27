// Место работы на карте (по макету): двигаешь карту — точка в центре; «Моё местоположение»;
// поиск адреса; адрес подставляется сам (OpenStreetMap через наш сервер); уточнение «как найти вход».
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { GeoHit, geoReverse, geoSearch } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { BrandIcon } from './BrandIcon';
import { PrimaryButton, inputStyle, tgAlert } from './ui';

// Центры городов: карта открывается там, где мастер работает, если точки ещё нет
const CITY_CENTER: Record<string, [number, number]> = {
  'Ташкент': [41.3111, 69.2797], 'Самарканд': [39.6542, 66.9597], 'Бухара': [39.7681, 64.4556], 'Ургенч': [41.5506, 60.6317],
  'Хива': [41.3783, 60.3639], 'Нукус': [42.4611, 59.6003], 'Андижан': [40.7821, 72.3442], 'Наманган': [40.9983, 71.6726],
  'Фергана': [40.3842, 71.7843], 'Коканд': [40.5286, 70.9425], 'Карши': [38.8606, 65.7891], 'Термез': [37.2242, 67.2783],
  'Джизак': [40.1158, 67.8422], 'Навои': [40.1039, 65.3688], 'Гулистан': [40.4897, 68.7842],
};

export type Place = { lat: number; lon: number; address: string; note: string };

type Props = { initial: Partial<Place>; city?: string; onSave: (p: Place) => void; onClose: () => void };

export const MapPicker: React.FC<Props> = ({ initial, city, onSave, onClose }) => {
  const { t, lang } = useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [center, setCenter] = useState<[number, number]>(
    initial.lat != null && initial.lon != null ? [initial.lat, initial.lon] : CITY_CENTER[city || ''] || CITY_CENTER['Ташкент']);
  const [address, setAddress] = useState(initial.address || '');
  const [note, setNote] = useState(initial.note || '');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [locating, setLocating] = useState(false);
  const moved = useRef(initial.lat == null);

  // Кнопка «Назад» Telegram закрывает карту
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const h = () => closeRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, []);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(center, initial.lat != null ? 17 : 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(m);
    m.on('moveend', () => { const c = m.getCenter(); moved.current = true; setCenter([c.lat, c.lng]); });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Адрес по точке — после остановки карты
  useEffect(() => {
    if (!moved.current) return;
    let alive = true;
    const id = window.setTimeout(() => {
      geoReverse(center[0], center[1], lang).then((a) => { if (alive && a) setAddress(a); }).catch(() => {});
    }, 400);
    return () => { alive = false; window.clearTimeout(id); };
  }, [center, lang]);

  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    let alive = true;
    const id = window.setTimeout(() => { geoSearch(q.trim(), lang).then((h) => alive && setHits(h)).catch(() => {}); }, 400);
    return () => { alive = false; window.clearTimeout(id); };
  }, [q, lang]);

  const fly = (lat: number, lon: number) => { map.current?.setView([lat, lon], 17); };

  const locate = () => {
    const tg = (window as any).Telegram?.WebApp;
    const done = (lat: number, lon: number) => { setLocating(false); fly(lat, lon); };
    const fail = () => { setLocating(false); tgAlert(t('mp_locate_fail')); };
    setLocating(true);
    const lm = tg?.LocationManager;
    if (lm?.init) {
      lm.init(() => {
        if (!lm.isLocationAvailable) { browser(); return; }
        lm.getLocation((loc: any) => (loc ? done(loc.latitude, loc.longitude) : fail()));
      });
      return;
    }
    browser();
    function browser() {
      if (!navigator.geolocation) { fail(); return; }
      navigator.geolocation.getCurrentPosition((p) => done(p.coords.latitude, p.coords.longitude), fail, { enableHighAccuracy: true, timeout: 10000 });
    }
  };

  const floating: React.CSSProperties = { backgroundColor: 'var(--tg-theme-bg-color)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('mp_title')} style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />

      {/* Точка всегда в центре карты */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)', zIndex: 500, pointerEvents: 'none', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.35))' }}>
        <svg width="44" height="56" viewBox="0 0 24 30"><path d="M12 29s9-9.2 9-16a9 9 0 1 0-18 0c0 6.8 9 16 9 16z" fill="#50C878" /><circle cx="12" cy="12.5" r="3.6" fill="#14261B" /></svg>
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 600, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ ...floating, display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 14px', borderRadius: 14 }}>
          <span style={{ color: 'var(--tg-theme-hint-color)', display: 'flex' }}><BrandIcon name="search" size={18} strokeWidth={2} /></span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mp_search')} aria-label={t('mp_search')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', fontSize: 16 }} />
        </label>
        {hits.length > 0 && (
          <div style={{ ...floating, borderRadius: 14, overflow: 'hidden' }}>
            {hits.map((h, i) => (
              <button key={`${h.lat},${h.lon}`} type="button" onClick={() => { fly(h.lat, h.lon); setQ(''); setHits([]); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'none', color: 'var(--tg-theme-text-color)', borderTop: i ? '1px solid rgba(127,127,127,0.15)' : 'none',
              }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{h.address}</div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.full}</div>
              </button>
            ))}
          </div>
        )}
        {!hits.length && (
          <span style={{ alignSelf: 'center', padding: '6px 12px', borderRadius: 999, fontSize: 13, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}>{t('mp_drag_hint')}</span>
        )}
      </div>

      <button type="button" onClick={locate} aria-label={t('mp_locate')} disabled={locating} style={{
        ...floating, position: 'absolute', right: 14, bottom: 270, zIndex: 600, width: 48, height: 48, borderRadius: 24, border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tg-theme-text-color)', opacity: locating ? 0.6 : 1,
      }}><BrandIcon name="locate" size={22} /></button>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 600, padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
        borderRadius: '22px 22px 0 0', backgroundColor: 'var(--tg-theme-bg-color)', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)' }}>{t('mp_point')}</span>
        <span style={{ fontSize: 17, fontWeight: 800, minHeight: 22 }}>{address || '…'}</span>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)' }}>
          {t('mp_note')}
          <input type="text" value={note} maxLength={200} placeholder={t('mp_note_ph')} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{
            flex: '0 0 auto', padding: '0 16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)',
          }}>{t('mp_cancel')}</button>
          <div style={{ flex: 1 }}>
            <PrimaryButton onClick={() => onSave({ lat: +center[0].toFixed(6), lon: +center[1].toFixed(6), address: address.trim(), note: note.trim() })}>
              {t('mp_save')}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};
