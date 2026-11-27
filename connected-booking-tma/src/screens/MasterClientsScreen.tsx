import React, { useEffect, useRef, useState } from 'react';
import { Title, Text, Spinner } from '@telegram-apps/telegram-ui';

import { fetchCustomers, fetchCurrentMaster, Customer, CustomerSort } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';

type Props = {
  onBack: () => void;
  onOpenClient: (key: string) => void;
  /** Вкладка кабинета инструктора: назад не нужен, снизу меню */
  embedded?: boolean;
};

const SORTS: CustomerSort[] = ['recent', 'visits', 'spent', 'lost'];

const chip = (active: boolean): React.CSSProperties => ({
  flex: '0 0 auto', padding: '8px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
  color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
});

export const MasterClientsScreen: React.FC<Props> = ({ onBack, onOpenClient, embedded }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t, lang } = useLanguage();
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU';

  const [items, setItems] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CustomerSort>('recent');
  const [team, setTeam] = useState(false);
  const [canTeam, setCanTeam] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton || embedded) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg, embedded]);

  useEffect(() => {
    fetchCurrentMaster().then((m) => {
      const manager = !!m && (m.role === 'owner' || m.role === 'admin') && m.business?.kind === 'team';
      setCanTeam(manager);
      setTeam(manager); // владелец салона по умолчанию видит всех клиентов салона
    });
  }, []);

  // Поиск с небольшой задержкой, чтобы не дёргать сервер на каждую букву
  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchCustomers({ q: query, sort, scope: team ? 'team' : '' })
        .then(setItems)
        .catch(() => setItems([]));
    }, query ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [query, sort, team]);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'Asia/Tashkent' }) : '';

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: embedded ? 110 : 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 16px 8px' }}>
        <Konnektik mood="happy" size={72} />
        <div>
          <Title level="2" weight="1">{t('cl_title')}</Title>
          <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
            {items ? pluralize(lang, items.length, t('p_clients')) : ' '}
          </Text>
        </div>
      </div>

      <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {canTeam && (
          <div style={{ display: 'flex', gap: 6, backgroundColor: 'var(--tg-theme-bg-color)', padding: 4, borderRadius: 12 }}>
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setTeam(v)}
                style={{ ...chip(team === v), flex: 1, borderRadius: 10 }}>
                {v ? t('cl_scope_team') : t('cl_scope_mine')}
              </button>
            ))}
          </div>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('cl_search')}
          aria-label={t('cl_search')}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: 'none', fontSize: 16,
            backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SORTS.map((s) => (
            <button key={s} type="button" style={chip(sort === s)} onClick={() => setSort(s)}>{t(`cl_sort_${s}`)}</button>
          ))}
        </div>
        {sort === 'lost' && (
          <Text style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{t('cl_lost_hint')}</Text>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
        {items === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, textAlign: 'center' }}>
            <Konnektik mood="think" size={110} />
            <Text style={{ marginTop: 12, color: 'var(--tg-theme-hint-color)' }}>
              {query ? t('cl_nothing_found') : t('cl_empty')}
            </Text>
          </div>
        ) : items.map((c) => (
          <button key={c.key} type="button" onClick={() => { tg?.HapticFeedback?.selectionChanged(); onOpenClient(c.key); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--tg-theme-bg-color)', textAlign: 'left', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit',
            }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                {c.upcoming > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#50C878', whiteSpace: 'nowrap' }}>
                    {fill(t('cl_next'), { date: fmtDate(c.next_visit) })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pluralize(lang, c.visits, t('p_visits'))}
                {c.last_visit ? ` · ${fill(t('cl_last'), { date: fmtDate(c.last_visit) })}` : ''}
                {c.spent ? ` · ${c.spent.toLocaleString('ru-RU')} UZS` : ''}
              </div>
              {c.note && (
                <div style={{ fontSize: 12, marginTop: 2, color: 'var(--tg-theme-text-color)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📝 {c.note}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
