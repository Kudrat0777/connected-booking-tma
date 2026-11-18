import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Title, Text, Button, Spinner } from '@telegram-apps/telegram-ui';
import { Icon28CopyOutline, Icon28ShareOutline } from '@vkontakte/icons';
import QRCode from 'qrcode';

import { fetchCurrentMaster, fetchMasterAnalytics, CurrentMaster, SourceStat } from '../helpers/api';
import { LINK_SOURCES, clientLink, copyText, shareToTelegram, sourceLabel } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';

type Props = {
  onBack: () => void;
  onOpenAnalytics: () => void;
};

type Target = 'business' | 'master';

const chip = (active: boolean): React.CSSProperties => ({
  flex: '0 0 auto',
  padding: '8px 12px',
  borderRadius: 999,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  backgroundColor: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
  color: active ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
  boxShadow: active ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
});

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

export const MasterLinksScreen: React.FC<Props> = ({ onBack, onOpenAnalytics }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t } = useLanguage();
  const [me, setMe] = useState<CurrentMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Target>('master');
  const [source, setSource] = useState('ig');
  const [qr, setQr] = useState('');
  const [stats, setStats] = useState<SourceStat[]>([]);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  useEffect(() => {
    fetchCurrentMaster()
      .then((m) => {
        setMe(m);
        // В заведении с командой по умолчанию продвигаем страницу заведения
        if (m?.business?.kind === 'team') setTarget('business');
      })
      .finally(() => setLoading(false));
    fetchMasterAnalytics(0, 'month').then((a) => setStats(a.sources || [])).catch(() => {});
  }, []);

  const isTeam = me?.business?.kind === 'team';
  const link = useMemo(() => {
    if (!me) return '';
    if (target === 'business' && me.business) return clientLink('b', me.business.slug, source);
    return clientLink('m', me.slug, source);
  }, [me, target, source]);

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 560, color: { dark: '#2B2A29', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [link]);

  const haptic = (t: 'light' | 'success' = 'light') => {
    if (!tg?.HapticFeedback) return;
    if (t === 'light') tg.HapticFeedback.impactOccurred('light');
    else tg.HapticFeedback.notificationOccurred('success');
  };

  const onCopy = async () => {
    haptic();
    const ok = await copyText(link);
    if (ok) haptic('success');
    const msg = ok ? t('links_copied') : link;
    if (tg?.showAlert) tg.showAlert(msg); else alert(msg);
  };

  const shareText = target === 'business' && me?.business
    ? fill(t('links_share_business'), { name: me.business.name })
    : t('links_share_master');

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }
  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Konnektik mood="think" size={140} />
        <Text style={{ marginTop: 16, color: 'var(--tg-theme-hint-color)' }}>{t('load_error')}</Text>
      </div>
    );
  }

  const totalVisits = stats.reduce((s, r) => s + r.visits, 0);
  const totalBookings = stats.reduce((s, r) => s + r.bookings, 0);

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 8px' }}>
        <Konnektik mood="explain" size={84} />
        <div>
          <Title level="2" weight="1" style={{ marginBottom: 4 }}>{t('links_title')}</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, lineHeight: 1.35 }}>
            {t('links_desc')}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
        {isTeam && (
          <div style={{ display: 'flex', gap: 8, backgroundColor: 'var(--tg-theme-bg-color)', padding: 4, borderRadius: 12 }}>
            {(['business', 'master'] as Target[]).map((tgt) => (
              <button
                key={tgt}
                type="button"
                onClick={() => { haptic(); setTarget(tgt); }}
                style={{ ...chip(target === tgt), flex: 1, borderRadius: 10, boxShadow: 'none' }}
              >
                {tgt === 'business' ? `🏠 ${me.business?.name}` : `👤 ${t('links_my_page')}`}
              </button>
            ))}
          </div>
        )}

        <div>
          <Text style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '4px 4px 8px' }}>
            {t('links_where')}
          </Text>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {LINK_SOURCES.map((s) => (
              <button key={s.id || 'none'} type="button" style={chip(source === s.id)} onClick={() => { haptic(); setSource(s.id); }}>
                {s.emoji} {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', wordBreak: 'break-all', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '10px 12px', borderRadius: 10, marginBottom: 12 }}>
            {link}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="m" mode="bezeled" stretched before={<Icon28CopyOutline width={20} height={20} />} onClick={onCopy}>
              {t('btn_copy')}
            </Button>
            <Button size="m" mode="filled" stretched before={<Icon28ShareOutline width={20} height={20} />} onClick={() => { haptic(); shareToTelegram(link, shareText); }}>
              {t('btn_share')}
            </Button>
          </div>
        </div>

        {qr && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <img src={qr} alt={t('links_qr_alt')} style={{ width: 220, height: 220, borderRadius: 12, background: '#fff' }} />
            <Text style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', textAlign: 'center' }}>
              {t('links_qr_hint')}
            </Text>
          </div>
        )}

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>{t('links_sources_title')}</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{t('links_month')}</div>
          </div>
          {stats.length === 0 ? (
            <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
              {t('links_no_visits')}
            </Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.map((r) => {
                const share = totalVisits ? Math.round((r.visits / totalVisits) * 100) : 0;
                return (
                  <div key={r.source}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span>{sourceLabel(r.source, t)}</span>
                      <span style={{ color: 'var(--tg-theme-hint-color)' }}>{fill(t('links_row'), { visits: r.visits, bookings: r.bookings })}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                      <div style={{ width: `${Math.max(share, 3)}%`, height: '100%', borderRadius: 3, backgroundColor: 'var(--tg-theme-button-color)' }} />
                    </div>
                  </div>
                );
              })}
              <Text style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                {fill(t('links_total'), { visits: totalVisits, bookings: totalBookings })}
              </Text>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Button size="s" mode="plain" onClick={onOpenAnalytics}>{t('links_all_stats')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
