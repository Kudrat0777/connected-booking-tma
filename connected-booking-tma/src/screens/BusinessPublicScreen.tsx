import React, { useEffect, useRef, useState } from 'react';
import { Title, Text, Spinner } from '@telegram-apps/telegram-ui';

import { fetchBusinessBySlug, fetchSalonServices, BusinessPublic, useTunnelImage } from '../helpers/api';
import { Konnektik } from '../components/Konnektik';
import { Avatar as UiAvatar } from '../components/ui';
import { useLanguage } from '../helpers/LanguageContext';

type Props = {
  slug: string;
  onBack: () => void;
  onOpenMaster: (masterId: number, masterName: string) => void;
  onAnyMaster?: (businessName: string) => void;
};

const MasterAvatar: React.FC<{ src?: string; name: string }> = ({ src, name }) => {
  const url = useTunnelImage(src);
  return url ? (
    <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover' }} />
  ) : (
    <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'var(--tg-theme-secondary-bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22 }}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
};

/** Страница заведения для клиента: кто работает, рейтинг, переход к записи к конкретному мастеру. */
export const BusinessPublicScreen: React.FC<Props> = ({ slug, onBack, onOpenMaster, onAnyMaster }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t } = useLanguage();
  const [biz, setBiz] = useState<BusinessPublic | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  // Есть ли услуги, на которые можно записаться к любому свободному мастеру
  const [anyAvailable, setAnyAvailable] = useState(false);

  useEffect(() => {
    fetchBusinessBySlug(slug).then((b) => { setBiz(b); setState(b ? 'ok' : 'missing'); });
    fetchSalonServices(slug).then((list) => setAnyAvailable(list.length > 0));
  }, [slug]);

  if (state === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }
  if (!biz) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: 'var(--tg-theme-text-color)' }}>
        <Konnektik mood="think" size={140} />
        <Title level="2" weight="1" style={{ marginTop: 16 }}>{t('biz_not_found')}</Title>
        <Text style={{ color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>{t('biz_link_old')}</Text>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ padding: '24px 20px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
        {biz.logo_url ? <UiAvatar src={biz.logo_url} name={biz.name} size={80} radius={24} /> : <Konnektik mood="hello" size={88} />}
        <div style={{ minWidth: 0 }}>
          <Title level="1" weight="1" style={{ marginBottom: 4 }}>{biz.name}</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
            {[biz.category, biz.city].filter(Boolean).join(' · ')}
          </Text>
          {biz.address && (
            <Text style={{ display: 'block', color: 'var(--tg-theme-hint-color)', fontSize: 13, marginTop: 2 }}>📍 {biz.address}</Text>
          )}
        </div>
      </div>

      {biz.description && (
        <Text style={{ display: 'block', padding: '0 20px 12px', fontSize: 15, lineHeight: 1.4 }}>{biz.description}</Text>
      )}

      {anyAvailable && onAnyMaster && biz.masters.length > 1 && (
        <div style={{ padding: '0 16px 12px' }}>
          <button
            type="button"
            onClick={() => { tg?.HapticFeedback?.impactOccurred('light'); onAnyMaster(biz.name); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{t('biz_any_title')}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{t('biz_any_desc')}</div>
            </div>
            <span style={{ fontSize: 22 }}>→</span>
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        <Text style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', margin: '8px 4px' }}>
          {t('biz_choose_master')}
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {biz.masters.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { tg?.HapticFeedback?.impactOccurred('light'); onOpenMaster(m.id, m.name); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, border: 'none', backgroundColor: 'var(--tg-theme-bg-color)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textAlign: 'left', cursor: 'pointer', color: 'var(--tg-theme-text-color)', font: 'inherit' }}
            >
              <MasterAvatar src={m.avatar_url} name={m.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                  {m.category}{m.rating ? ` · ★ ${m.rating}` : ''}{m.reviews_count ? ` (${m.reviews_count})` : ''}
                </div>
              </div>
              <span style={{ color: 'var(--tg-theme-button-color)', fontWeight: 600, fontSize: 14 }}>{t('biz_book')}</span>
            </button>
          ))}
          {biz.masters.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
              <Konnektik mood="think" size={70} />
              <Text style={{ color: 'var(--tg-theme-hint-color)' }}>{t('biz_masters_soon')}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
