import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { Icon24Search } from '@vkontakte/icons';

import { fetchMasters, fetchMyBookings, Booking, MasterPublicProfile } from '../helpers/api';
import { MyClass, fetchMyClasses } from '../helpers/classes';
import { PROFESSIONS, professionLabel } from '../helpers/professions';
import { ProfessionGlyph } from '../components/ProfessionIcon';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Badge, Chip, card, localeFor, tashkent } from '../components/ui';

type Props = {
  telegramId: number;
  firstName?: string;
  onOpenMaster: (masterId: number, masterName: string) => void;
  onOpenBookings: () => void;
};

const CITIES = [
  { key: 'city_urgench', value: 'Ургенч' }, { key: 'city_tashkent', value: 'Ташкент' },
  { key: 'city_samarkand', value: 'Самарканд' }, { key: 'city_bukhara', value: 'Бухара' }, { key: 'city_khiva', value: 'Хива' },
];
const CITY_KEY = 'ctime_city';

/** «Сегодня в 17:00», «Завтра в 11:00», «20 нояб. в 10:00» */
export function useWhen() {
  const { t, lang } = useLanguage();
  return (iso: string) => {
    const d = tashkent.date(iso);
    const today = tashkent.today();
    const tomorrow = new Date(`${today}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    const time = tashkent.time(iso);
    if (d === today) return fill(t('ch_today_at'), { time });
    if (d === tomorrowIso) return fill(t('ch_tomorrow_at'), { time });
    const day = new Date(`${d}T12:00:00`).toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'short', weekday: 'short' });
    return fill(t('ch_date_at'), { date: day, time });
  };
}

export const MasterCard: React.FC<{ m: MasterPublicProfile; onOpen: () => void }> = ({ m, onOpen }) => {
  const { t } = useLanguage();
  const when = useWhen();
  const category = professionLabel(t, m);
  const sub = [category, m.business?.kind === 'team' ? m.business.name : ''].filter(Boolean).join(' · ');
  return (
    <button type="button" onClick={onOpen} style={{
      ...card, display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', cursor: 'pointer',
      textAlign: 'left', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
    }}>
      <Avatar src={m.avatar_url} name={m.name} size={58} radius={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
          {m.reviews_count > 0
            ? <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>★ {m.rating.toFixed(1)} <span style={{ color: 'var(--tg-theme-hint-color)', fontWeight: 400 }}>({m.reviews_count})</span></span>
            : <Badge tone="brand">{t('ch_new')}</Badge>}
        </div>
        {sub && <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
        <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600, color: m.next_free ? 'var(--brand-ink)' : 'var(--tg-theme-hint-color)' }}>
          {m.next_free ? `🕐 ${when(m.next_free)}` : t('ch_no_free')}
        </div>
      </div>
      <span aria-hidden="true" style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</span>
    </button>
  );
};

export const ClientHomeScreen: React.FC<Props> = ({ telegramId, firstName, onOpenMaster, onOpenBookings }) => {
  const { t } = useLanguage();
  const when = useWhen();
  const [masters, setMasters] = useState<MasterPublicProfile[] | null>(null);
  const [next, setNext] = useState<Booking | null>(null);
  const [nextClass, setNextClass] = useState<MyClass | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState<string>(() => {
    try { return localStorage.getItem(CITY_KEY) || 'Ургенч'; } catch { return 'Ургенч'; }
  });

  // Ближайшая запись клиента — главное, что ему нужно увидеть
  useEffect(() => {
    fetchMyBookings(telegramId).then((list) => {
      const now = Date.now();
      const upcoming = list
        .filter((b) => b.status !== 'rejected' && new Date(b.slot.time).getTime() > now)
        .sort((a, b) => new Date(a.slot.time).getTime() - new Date(b.slot.time).getTime());
      setNext(upcoming[0] ?? null);
    }).catch(() => setNext(null));
    fetchMyClasses().then((list) => setNextClass(list[0] ?? null)).catch(() => setNextClass(null));
  }, [telegramId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMasters(null);
      fetchMasters({ search: search.trim() || undefined, city, profession: category || undefined, ordering: 'rating' })
        .then((list) => {
          // Сначала те, к кому можно записаться раньше
          const ts = (m: MasterPublicProfile) => (m.next_free ? new Date(m.next_free).getTime() : Infinity);
          setMasters([...list].sort((a, b) => ts(a) - ts(b)));
        })
        .catch(() => setMasters([]));
    }, search ? 350 : 0);
    return () => window.clearTimeout(id);
  }, [search, city, category]);

  // Показываем то, что раньше: личную запись или занятие в группе
  const classFirst = !!nextClass && (!next || new Date(nextClass.start) < new Date(next.slot.time));

  const cityLabel = useMemo(() => {
    const c = CITIES.find((x) => x.value === city);
    return c ? t(c.key) : city;
  }, [city, t]);

  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));
  const greetingKey = hour < 12 ? 'ch_morning' : hour < 18 ? 'ch_day' : 'ch_evening';

  return (
    <div style={{ padding: '20px 16px 110px', color: 'var(--tg-theme-text-color)' }}>
      {/* Приветствие и город */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>
            {fill(t(greetingKey), { name: firstName || '' }).replace(/,\s*!/, '!')}
          </div>
          <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{t('ch_subtitle')}</div>
        </div>
        <label style={{ position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 10, backgroundColor: 'var(--tg-theme-bg-color)', fontSize: 14, fontWeight: 600, color: 'var(--brand-ink)' }}>
          📍 {cityLabel}
          <select aria-label={t('m_edit_city_header')} value={city}
            onChange={(e) => { setCity(e.target.value); try { localStorage.setItem(CITY_KEY, e.target.value); } catch { /* приватный режим */ } }}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
            {CITIES.map((c) => <option key={c.value} value={c.value}>{t(c.key)}</option>)}
          </select>
        </label>
      </div>

      {/* Ближайшая запись */}
      {classFirst && nextClass && (
        <button type="button" onClick={onOpenBookings} style={{
          ...card, width: '100%', marginTop: 18, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          color: 'var(--brand-on-accent)', backgroundColor: 'var(--brand-accent)', boxShadow: '0 8px 24px rgba(80, 200, 120, 0.35)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>{t(nextClass.status === 'active' ? 'gc_you_in' : 'gc_you_wait')}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{when(nextClass.start)}</div>
          <div style={{ fontSize: 15, marginTop: 2 }}>{[nextClass.program || nextClass.group_name, nextClass.master_name].join(' · ')}</div>
          {nextClass.address && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>📍 {nextClass.address}</div>}
        </button>
      )}
      {next && !classFirst && (
        <button type="button" onClick={onOpenBookings} style={{
          ...card, width: '100%', marginTop: 18, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          color: 'var(--brand-on-accent)', backgroundColor: 'var(--brand-accent)', boxShadow: '0 8px 24px rgba(80, 200, 120, 0.35)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
            {next.status === 'pending' ? t('ch_next_pending') : t('ch_next_confirmed')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{when(next.slot.time)}</div>
          <div style={{ fontSize: 15, marginTop: 2 }}>{next.service_name} · {next.master_name}</div>
          {next.master_info?.address && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>📍 {next.master_info.address}</div>}
        </button>
      )}

      {/* Поиск */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '12px 14px', borderRadius: 14, backgroundColor: 'var(--tg-theme-bg-color)' }}>
        <Icon24Search style={{ color: 'var(--tg-theme-hint-color)', flex: '0 0 auto' }} />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_placeholder')} aria-label={t('search_placeholder')}
          style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--tg-theme-text-color)', width: '100%', fontSize: 16, fontFamily: 'inherit' }} />
      </div>

      {/* Сферы */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px -16px 0', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
        <Chip active={!category} onClick={() => setCategory('')}>{t('ch_all')}</Chip>
        {PROFESSIONS.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? '' : c)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ProfessionGlyph name={c} size={18} />{t(`pf_${c}`)}</span>
          </Chip>
        ))}
      </div>

      {/* Мастера */}
      <div style={{ fontSize: 18, fontWeight: 700, margin: '20px 4px 10px' }}>{t('ch_masters_title')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {masters === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></div>
        ) : masters.length === 0 ? (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
            <Konnektik mood="think" size={110} />
            <div style={{ fontWeight: 700, marginTop: 10 }}>{t('not_found_masters_header')}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{t('ch_try_other')}</div>
          </div>
        ) : masters.map((m) => (
          <MasterCard key={m.id} m={m} onOpen={() => onOpenMaster(m.id, m.name)} />
        ))}
      </div>
    </div>
  );
};
