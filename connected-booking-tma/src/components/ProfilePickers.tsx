// Выбор профессии и города списком (по макету): нижняя шторка, иконки профессий, поиск города.
import React, { useMemo, useState } from 'react';

import { PROFESSIONS, Profession } from '../helpers/professions';
import { CITIES } from '../helpers/cities';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { ProfessionIcon } from './ProfessionIcon';
import { BrandIcon } from './BrandIcon';
import { Sheet, inputStyle } from './ui';

const row = (on: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 46, padding: '4px 6px', border: 'none', borderRadius: 12,
  cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, textAlign: 'left', color: 'var(--tg-theme-text-color)',
  backgroundColor: on ? 'var(--brand-soft)' : 'transparent',
});
const Tick: React.FC<{ on: boolean }> = ({ on }) => (
  <span aria-hidden="true" style={{
    width: 22, height: 22, borderRadius: 11, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: on ? 'var(--brand-accent)' : 'transparent',
  }}>
    {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-accent, #14261B)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
  </span>
);

export const ProfessionSheet: React.FC<{ value: Profession; onPick: (p: Profession) => void; onClose: () => void }> = ({ value, onPick, onClose }) => {
  const { t } = useLanguage();
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 20, fontWeight: 800, margin: '0 6px 8px' }}>{t('pf_profession')}</div>
      <div role="radiogroup" aria-label={t('pf_profession')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PROFESSIONS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={value === p} onClick={() => { onPick(p); onClose(); }} style={row(value === p)}>
            <ProfessionIcon name={p} size={22} tile={34} />
            <span style={{ flex: 1, fontWeight: 600 }}>{t(`pf_${p}`)}</span>
            <Tick on={value === p} />
          </button>
        ))}
      </div>
    </Sheet>
  );
};

export const CitySheet: React.FC<{ value: string; onPick: (city: string) => void; onClose: () => void }> = ({ value, onPick, onClose }) => {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = useMemo(() => CITIES.filter((c) => !query || Object.values(c).some((n) => n.toLowerCase().includes(query))), [query]);
  const pick = (city: string) => { onPick(city); onClose(); };
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 20, fontWeight: 800, margin: '0 2px 10px' }}>{t('ep_city')}</div>
      <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44 }}>
        <span style={{ color: 'var(--tg-theme-hint-color)', display: 'flex' }}><BrandIcon name="search" size={18} strokeWidth={2} /></span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ct_search')} aria-label={t('ct_search')}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', fontSize: 16 }} />
      </label>
      <div role="radiogroup" aria-label={t('ep_city')} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8, maxHeight: '55vh', overflowY: 'auto' }}>
        {value && !CITIES.some((c) => c.ru === value) && !query && (
          <button type="button" role="radio" aria-checked onClick={() => pick(value)} style={row(true)}>
            <span style={{ flex: 1, fontWeight: 600 }}>{value}</span><Tick on />
          </button>
        )}
        {list.map((c) => (
          <button key={c.ru} type="button" role="radio" aria-checked={value === c.ru} onClick={() => pick(c.ru)} style={row(value === c.ru)}>
            <span style={{ flex: 1, fontWeight: 600 }}>{c[lang]}</span><Tick on={value === c.ru} />
          </button>
        ))}
        {query && !list.length && (
          <button type="button" onClick={() => pick(q.trim())} style={{ ...row(false), color: 'var(--brand-ink)', fontWeight: 700 }}>
            {fill(t('ct_add'), { name: q.trim() })}
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', textAlign: 'center', marginTop: 10 }}>{t('ct_hint')}</div>
    </Sheet>
  );
};
