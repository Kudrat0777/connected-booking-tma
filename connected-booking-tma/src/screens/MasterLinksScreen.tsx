import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, Spinner } from '@telegram-apps/telegram-ui';
import QRCode from 'qrcode';

import { fetchCurrentMaster, fetchMasterAnalytics, setShortName, CurrentMaster, SourceStat } from '../helpers/api';
import { LINK_SOURCES, clientLink, copyText, masterShortLink, shareToTelegram, sourceLabel } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { professionLabel } from '../helpers/professions';
import { BrandIcon } from '../components/BrandIcon';
import { Avatar, PrimaryButton, Sheet, inputStyle } from '../components/ui';
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
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameBusy, setNameBusy] = useState(false);

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
    return masterShortLink(me, source);
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

  const sub = [professionLabel(t, me), me.city].filter(Boolean).join(' · ');
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
    backgroundColor: primary ? 'var(--brand-accent)' : 'var(--brand-soft)', color: primary ? 'var(--brand-on-accent)' : 'var(--brand-ink)',
  });
  const h2: React.CSSProperties = { fontSize: 15, fontWeight: 800 };
  const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 };

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{t('links_title')}</div>
        <div style={{ ...hint, fontSize: 15 }}>{target === 'master' ? t('sl_desc') : t('links_desc')}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px' }}>
        {isTeam && (
          <div style={{ display: 'flex', gap: 8, backgroundColor: 'var(--tg-theme-bg-color)', padding: 4, borderRadius: 12 }}>
            {(['business', 'master'] as Target[]).map((tgt) => (
              <button key={tgt} type="button" onClick={() => { haptic(); setTarget(tgt); }}
                style={{ ...chip(target === tgt), flex: 1, borderRadius: 10, boxShadow: 'none' }}>
                {tgt === 'business' ? me.business?.name : t('links_my_page')}
              </button>
            ))}
          </div>
        )}

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {target === 'master' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '12px 12px 12px 14px', borderRadius: 14 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 20, fontWeight: 800, wordBreak: 'break-all' }}>{link.replace(/^https?:\/\//, '')}</span>
              <button type="button" aria-label={t('sl_edit')} onClick={() => { setNameDraft(me.short_name || me.slug); setNameError(''); setNameOpen(true); }} style={{
                width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)',
              }}><BrandIcon name="edit" size={18} strokeWidth={1.9} /></button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', wordBreak: 'break-all', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '10px 12px', borderRadius: 10 }}>
              {link}
            </div>
          )}
          {target === 'master' && <div style={hint}>{t('sl_name_hint')}</div>}
          <div style={{ ...hint, fontWeight: 700 }}>{t('links_where')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LINK_SOURCES.map((s) => (
              <button key={s.id || 'none'} type="button" style={{ ...chip(source === s.id), boxShadow: 'none' }} onClick={() => { haptic(); setSource(s.id); }}>
                {s.id ? t(s.labelKey) : t('sl_everywhere')}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onCopy} style={btn(false)}>{t('btn_copy')}</button>
            <button type="button" onClick={() => { haptic(); shareToTelegram(link, shareText); }} style={btn(true)}>{t('btn_share')}</button>
          </div>
        </div>

        {target === 'master' && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={h2}>{t('sl_preview_title')}</div>
            <div style={{ alignSelf: 'flex-end', maxWidth: 300, padding: '10px 12px', borderRadius: '16px 16px 4px 16px', backgroundColor: '#2B5278', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, color: '#E8F1FB', wordBreak: 'break-all' }}>{link.replace(/^https?:\/\//, '')}</span>
              <div style={{ borderLeft: '3px solid #7FB3FF', paddingLeft: 8, display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#7FB3FF' }}>CTime</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F5F5F5' }}>{me.name}{sub ? ` — ${sub}` : ''}</span>
                  <span style={{ fontSize: 13, color: '#C9D6E3' }}>{(me.bio || '').slice(0, 90) || t('sl_preview_desc')}</span>
                </div>
                <Avatar src={me.avatar_url} name={me.name} size={54} radius={10} />
              </div>
            </div>
            <div style={hint}>{t('sl_preview_hint')}</div>
          </div>
        )}

        {qr && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={qr} alt={t('links_qr_alt')} style={{ width: 120, height: 120, borderRadius: 12, background: '#fff', flex: '0 0 auto' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={h2}>{t('sl_qr_title')}</div>
              <div style={hint}>{t('links_qr_hint')}</div>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={h2}>{t('links_sources_title')}</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{t('links_month')}</div>
          </div>
          {stats.length === 0 ? (
            <div style={{ ...hint, fontSize: 14 }}>{t('links_no_visits')}</div>
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
                      <div style={{ width: `${Math.max(share, 3)}%`, height: '100%', borderRadius: 3, backgroundColor: 'var(--brand-accent)' }} />
                    </div>
                  </div>
                );
              })}
              <div style={hint}>{fill(t('links_total'), { visits: totalVisits, bookings: totalBookings })}</div>
            </div>
          )}
          <button type="button" onClick={onOpenAnalytics} style={{ marginTop: 12, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--brand-ink)' }}>
            {t('links_all_stats')}
          </button>
        </div>
      </div>
      {nameOpen && me && (
        <Sheet onClose={() => setNameOpen(false)}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{t('sl_title')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{t('sl_hint')}</div>
          <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 2, marginTop: 12, padding: '0 14px', height: 50 }}>
            <span style={{ color: 'var(--tg-theme-hint-color)', fontSize: 16 }}>{window.location.host}/</span>
            <input value={nameDraft} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label={t('sl_title')}
              onChange={(e) => { setNameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setNameError(''); }}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', fontSize: 16, fontWeight: 700 }} />
          </label>
          {nameError && <div style={{ color: '#E0533D', fontSize: 13, marginTop: 6 }}>{nameError}</div>}
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8, lineHeight: 1.4 }}>{t('sl_warn')}</div>
          <div style={{ marginTop: 14 }}>
            <PrimaryButton loading={nameBusy} disabled={nameDraft.length < 3} onClick={async () => {
              setNameBusy(true);
              try {
                const saved = await setShortName(nameDraft);
                setMe({ ...me, short_name: saved });
                setNameOpen(false);
                haptic('success');
              } catch (e: any) { setNameError(e?.message || t('sl_error')); }
              finally { setNameBusy(false); }
            }}>{t('sl_save')}</PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
};
