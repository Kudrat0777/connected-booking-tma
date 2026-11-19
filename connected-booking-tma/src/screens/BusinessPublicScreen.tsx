// Страница заведения для клиента: кто работает, рейтинг, запись к мастеру или к любому свободному.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { fetchBusinessBySlug, fetchSalonServices, BusinessPublic } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { pluralize } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Badge, PrimaryButton, card, page } from '../components/ui';

type Props = {
  slug: string;
  onBack: () => void;
  onOpenMaster: (masterId: number, masterName: string) => void;
  onAnyMaster?: (businessName: string) => void;
};

// Значения в базе — по-русски, на экране — на языке клиента
const CATS = ['Барбершоп', 'Салон красоты', 'Массаж', 'Маникюр / Педикюр', 'Брови и Ресницы',
  'Медицина', 'Спорт / Фитнес', 'Автосервис', 'Другое'];
const CITY_KEYS: Record<string, string> = {
  'Ургенч': 'city_urgench', 'Ташкент': 'city_tashkent', 'Самарканд': 'city_samarkand', 'Бухара': 'city_bukhara', 'Хива': 'city_khiva',
};

const haptic = () => (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');

export const BusinessPublicScreen: React.FC<Props> = ({ slug, onBack, onOpenMaster, onAnyMaster }) => {
  const { t, lang } = useLanguage();
  const [biz, setBiz] = useState<BusinessPublic | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  // Есть ли услуги, на которые можно записаться к любому свободному мастеру
  const [anyAvailable, setAnyAvailable] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, []);

  useEffect(() => {
    fetchBusinessBySlug(slug).then((b) => { setBiz(b); setState(b ? 'ok' : 'missing'); }).catch(() => setState('missing'));
    fetchSalonServices(slug).then((list) => setAnyAvailable(list.length > 0)).catch(() => {});
  }, [slug]);

  if (state === 'loading') {
    return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner size="l" /></div>;
  }
  if (!biz) {
    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="think" size={130} />
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>{t('biz_not_found')}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, maxWidth: 300 }}>{t('biz_link_old')}</div>
        <div style={{ width: '100%', maxWidth: 320, marginTop: 20 }}><PrimaryButton variant="soft" onClick={onBack}>{t('to_main_page')}</PrimaryButton></div>
      </div>
    );
  }

  const catLabel = (c?: string) => { const i = CATS.indexOf(c || ''); return i >= 0 ? t(`cat_${i}`) : (c || ''); };
  const cityLabel = (c?: string) => (c && CITY_KEYS[c] ? t(CITY_KEYS[c]) : c || '');

  const rated = biz.masters.filter((m) => m.reviews_count > 0);
  const reviews = rated.reduce((a, m) => a + m.reviews_count, 0);
  const rating = reviews ? rated.reduce((a, m) => a + m.rating * m.reviews_count, 0) / reviews : 0;
  const isMapLink = !!biz.address && /^https?:\/\//.test(biz.address);
  const showAny = anyAvailable && !!onAnyMaster && biz.masters.length > 1;

  return (
    <div style={{ ...page, paddingBottom: 40 }}>
      {/* Шапка */}
      <div style={{ backgroundColor: 'var(--tg-theme-bg-color)', padding: '28px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRadius: '0 0 24px 24px' }}>
        {biz.logo_url ? <Avatar src={biz.logo_url} name={biz.name} size={92} radius={28} /> : <Konnektik mood="hello" size={96} />}
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>{biz.name}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
          {[catLabel(biz.category), cityLabel(biz.city)].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {reviews > 0 && <Badge tone="brand">★ {rating.toFixed(1)} · {pluralize(lang, reviews, t('rv_count'))}</Badge>}
          {biz.masters.length > 0 && <Badge tone="off">{pluralize(lang, biz.masters.length, t('biz_masters_word'))}</Badge>}
        </div>
        {biz.address && (
          isMapLink ? (
            <button type="button" onClick={() => window.open(biz.address, '_blank')}
              style={{ marginTop: 12, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--brand-ink)' }}>
              📍 {t('biz_open_map')}
            </button>
          ) : (
            <div style={{ marginTop: 12, fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>📍 {biz.address}</div>
          )
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px 0' }}>
        {biz.description && (
          <div style={{ ...card, fontSize: 15, lineHeight: 1.5 }}>{biz.description}</div>
        )}

        {/* Любой свободный мастер */}
        {showAny && (
          <button type="button" onClick={() => { haptic(); onAnyMaster!(biz.name); }} style={{
            ...card, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
            background: 'linear-gradient(135deg, var(--brand-accent, #50C878), #3FAF68)', color: 'var(--brand-on-accent, #14261B)', padding: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{t('biz_any_title')}</div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>{t('biz_any_desc')}</div>
            </div>
            <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 800 }}>›</span>
          </button>
        )}

        {/* Мастера */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 4px 10px' }}>{t('biz_choose_master')}</div>
          {biz.masters.length === 0 ? (
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Konnektik mood="think" size={64} />
              <div style={{ color: 'var(--tg-theme-hint-color)' }}>{t('biz_masters_soon')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {biz.masters.map((m) => (
                <button key={m.id} type="button" onClick={() => { haptic(); onOpenMaster(m.id, m.name); }} style={{
                  ...card, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit', width: '100%', color: 'var(--tg-theme-text-color)',
                }}>
                  <Avatar src={m.avatar_url} name={m.name} size={52} radius={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                      {m.reviews_count > 0
                        ? <><span style={{ color: '#F5A623' }}>★</span> {m.rating.toFixed(1)} ({m.reviews_count}){m.category ? ` · ${catLabel(m.category)}` : ''}</>
                        : <>{t('mp_new_master')}{m.category ? ` · ${catLabel(m.category)}` : ''}</>}
                    </div>
                  </div>
                  <span aria-label={t('biz_book')} style={{ fontSize: 22, color: 'var(--tg-theme-hint-color)', flex: '0 0 auto' }}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
