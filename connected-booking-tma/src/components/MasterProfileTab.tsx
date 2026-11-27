import React from 'react';

import type { CurrentMaster } from '../helpers/api';
import { professionLabel } from '../helpers/professions';
import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';
import { clientLink, copyText } from '../helpers/links';
import { Avatar, Badge, card } from './ui';

type Props = {
  me: CurrentMaster | null;
  servicesCount: number;
  /** Инструктору групп услуги не обязательны — не пугаем предупреждением */
  hideServicesWarning?: boolean;
  onEditProfile: () => void;
  onOpenSchedule: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onOpenLinks?: () => void;
  onOpenTeam?: () => void;
  onOpenSalonCalendar?: () => void;
  onOpenClients?: () => void;
  onOpenGroups?: () => void;
  onSwitchToClient: () => void;
  onLogoutClick: () => void;
  onDeleteAccount: () => void;
};

export const MasterProfileTab: React.FC<Props> = (p) => {
  const { lang, setLang, t } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const me = p.me;
  const isTeam = me?.business?.kind === 'team';
  const canManage = me?.role === 'owner' || me?.role === 'admin';
  const haptic = () => tg?.HapticFeedback?.selectionChanged();

  const category = me ? professionLabel(t, me) : '';
  const myLink = me ? clientLink('m', me.slug) : '';

  // Быстрые действия: то, что мастер открывает каждый день, — крупными плитками
  const tiles: { emoji: string; title: string; hint: string; onClick?: () => void; show: boolean }[] = [
    { emoji: '🗓', title: t('m_manage_schedule'), hint: t('mp_tile_schedule'), onClick: p.onOpenSchedule, show: true },
    { emoji: '🔗', title: t('prof_links'), hint: t('mp_tile_links'), onClick: p.onOpenLinks, show: true },
    { emoji: '👥', title: t('prof_clients'), hint: t('mp_tile_clients'), onClick: p.onOpenClients, show: true },
    { emoji: '📊', title: t('m_statistics'), hint: t('mp_tile_stats'), onClick: p.onOpenAnalytics, show: true },
    { emoji: '🧘', title: t('gc_manage'), hint: t('gc_manage_hint'), onClick: p.onOpenGroups, show: true },
    { emoji: '🏠', title: t('prof_calendar'), hint: t('prof_calendar_desc'), onClick: p.onOpenSalonCalendar, show: isTeam },
    { emoji: '🤝', title: t('prof_team'), hint: canManage ? t('prof_team_desc_manage') : t('prof_team_desc'), onClick: p.onOpenTeam, show: isTeam || canManage },
  ];

  const row = (emoji: string, title: string, onClick: () => void, danger = false) => (
    <button type="button" onClick={() => { haptic(); onClick(); }} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 4px', border: 'none', background: 'none',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, textAlign: 'left',
      color: danger ? 'var(--tg-theme-destructive-text-color, #FF3B30)' : 'var(--tg-theme-text-color)',
      borderTop: '1px solid var(--tg-theme-secondary-bg-color)',
    }}>
      <span style={{ width: 24, textAlign: 'center' }}>{emoji}</span>
      <span style={{ flex: 1 }}>{title}</span>
      {!danger && <span style={{ color: 'var(--tg-theme-hint-color)' }}>›</span>}
    </button>
  );

  return (
    <div style={{ padding: '20px 16px 120px', color: 'var(--tg-theme-text-color)' }}>
      {/* Карточка мастера — как её видят клиенты */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar src={me?.avatar_url} name={me?.name || '…'} size={64} radius={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{me?.name || '…'}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
              {[category, isTeam ? me?.business?.name : ''].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {me && (me.reviews_count > 0
                ? <Badge tone="brand">★ {me.rating.toFixed(1)} · {me.reviews_count} {t('reviews')}</Badge>
                : <Badge tone="brand">{t('ch_new')}</Badge>)}
              {isTeam && me && <Badge tone="off">{t(`roles_${me.role}`)}</Badge>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={() => { haptic(); p.onEditProfile(); }} style={softBtn}>✏️ {t('m_edit_profile')}</button>
          <button type="button" onClick={async () => { haptic(); const ok = await copyText(myLink); const m = ok ? t('links_copied') : myLink; if (tg?.showAlert) tg.showAlert(m); else alert(m); }}
            style={softBtn}>🔗 {t('mp_copy_my_link')}</button>
        </div>
      </div>

      {/* Быстрые действия */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {tiles.filter((x) => x.show).map((x) => (
          <button key={x.title} type="button" onClick={() => { haptic(); x.onClick?.(); }} style={{
            ...card, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--tg-theme-text-color)', padding: 14,
          }}>
            <div style={{ fontSize: 24 }}>{x.emoji}</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{x.title}</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 2, lineHeight: 1.3 }}>{x.hint}</div>
          </button>
        ))}
      </div>

      {p.servicesCount === 0 && !p.hideServicesWarning && (
        <div style={{ ...card, marginTop: 12, backgroundColor: 'rgba(255,149,0,0.1)', fontSize: 14 }}>⚠️ {t('mp_no_services_warn')}</div>
      )}

      {/* Настройки */}
      <div style={{ ...card, marginTop: 12, padding: '4px 14px' }}>
        {row('⭐', t('m_my_reviews'), p.onOpenReviews)}
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', fontSize: 16, position: 'relative', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
          <span style={{ width: 24, textAlign: 'center' }}>🌐</span>
          <span style={{ flex: 1 }}>{t('mp_language')}</span>
          <span style={{ color: 'var(--brand-ink)', fontWeight: 600 }}>{{ ru: 'Русский', uz: "O'zbekcha", en: 'English' }[lang]}</span>
          <select aria-label={t('mp_language')} value={lang} onChange={(e) => { haptic(); setLang(e.target.value as LangCode); }}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
            <option value="ru">Русский</option>
            <option value="uz">O'zbekcha</option>
            <option value="en">English</option>
          </select>
        </label>
        {row('👤', t('m_login_as_client'), p.onSwitchToClient)}
        {row('🚪', t('m_logout'), p.onLogoutClick)}
        {row('🗑', t('m_delete_account'), p.onDeleteAccount, true)}
      </div>
    </div>
  );
};

const softBtn: React.CSSProperties = {
  flex: 1, padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
  backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)',
};
