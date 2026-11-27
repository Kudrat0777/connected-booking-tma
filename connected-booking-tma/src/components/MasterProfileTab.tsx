import React from 'react';

import type { CurrentMaster } from '../helpers/api';
import { professionLabel, professionOf } from '../helpers/professions';
import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';
import { clientLink, copyText, shareToTelegram } from '../helpers/links';
import { Avatar, Badge, card } from './ui';
import { BrandIcon, BrandIconName } from './BrandIcon';
import { ProfessionGlyph } from './ProfessionIcon';

type Props = {
  me: CurrentMaster | null;
  servicesCount: number;
  /** Инструктору групп услуги не обязательны — не пугаем предупреждением */
  hideServicesWarning?: boolean;
  /** Инструктор групп (йога, фитнес, танцы, курсы): свои плитки и слова */
  classFirst?: boolean;
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
  const classes = !!p.classFirst;
  const profession = professionOf(me);

  const subtitle = [me ? professionLabel(t, me) : '', isTeam ? me?.business?.name : '', me?.city].filter(Boolean).join(' · ');
  const myLink = me ? clientLink('m', me.slug) : '';
  const share = async () => {
    haptic();
    if (!myLink) return;
    if (tg?.openTelegramLink) { shareToTelegram(myLink, t('links_share_master')); return; }
    const ok = await copyText(myLink);
    const m = ok ? t('links_copied') : myLink;
    if (tg?.showAlert) tg.showAlert(m); else alert(m);
  };
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

  // Плитки: у инструктора без повторов нижнего меню (ученики и статистика там уже есть)
  type Tile = { icon: BrandIconName; title: string; hint: string; onClick?: () => void; show: boolean };
  const tiles: Tile[] = classes ? [
    { icon: 'calendar', title: t('gc_manage'), hint: t('pf_groups_hint'), onClick: p.onOpenGroups, show: true },
    { icon: 'qr', title: t('prof_links'), hint: t('mp_tile_links'), onClick: p.onOpenLinks, show: true },
    { icon: 'sun', title: t('pf_timeoff'), hint: t('pf_timeoff_hint'), onClick: p.onOpenSchedule, show: true },
    { icon: 'team', title: cap(t(`pt_${profession}`)), hint: t('pf_team_hint'), onClick: p.onOpenTeam, show: isTeam || canManage },
  ] : [
    { icon: 'clock', title: t('m_manage_schedule'), hint: t('mp_tile_schedule'), onClick: p.onOpenSchedule, show: true },
    { icon: 'qr', title: t('prof_links'), hint: t('mp_tile_links'), onClick: p.onOpenLinks, show: true },
    { icon: 'clients', title: t('prof_clients'), hint: t('mp_tile_clients'), onClick: p.onOpenClients, show: true },
    { icon: 'stats', title: t('m_statistics'), hint: t('mp_tile_stats'), onClick: p.onOpenAnalytics, show: true },
    { icon: 'salon', title: t('prof_calendar'), hint: t('prof_calendar_desc'), onClick: p.onOpenSalonCalendar, show: isTeam },
    { icon: 'team', title: t('prof_team'), hint: canManage ? t('prof_team_desc_manage') : t('prof_team_desc'), onClick: p.onOpenTeam, show: isTeam || canManage },
  ];

  const rowStyle = (first: boolean, danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 50, padding: '0 2px', border: 'none', background: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, textAlign: 'left', boxSizing: 'border-box',
    color: danger ? 'var(--tg-theme-destructive-text-color, #FF3B30)' : 'var(--tg-theme-text-color)',
    borderTop: first ? 'none' : '1px solid rgba(127,127,127,0.15)',
  });
  const chevron = <span style={{ color: 'var(--tg-theme-hint-color)', display: 'flex' }}><BrandIcon name="chevron" size={16} strokeWidth={2.2} /></span>;
  const badge = me && me.reviews_count > 0
    ? `★ ${me.rating.toFixed(1)} · ${me.reviews_count} ${t('reviews')}`
    : t(classes ? `pf_new_${profession}` : 'ch_new');

  return (
    <div style={{ padding: '20px 16px 120px', color: 'var(--tg-theme-text-color)' }}>
      {/* Карточка мастера — как её видят клиенты */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar src={me?.avatar_url} name={me?.name || '…'} size={64} radius={20} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{me?.name || '…'}</div>
            {subtitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
                <ProfessionGlyph name={profession} size={18} strokeWidth={1.8} />
                <span style={{ minWidth: 0 }}>{subtitle}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {me && <Badge tone="brand">{badge}</Badge>}
              {isTeam && me && <Badge tone="off">{t(`roles_${me.role}`)}</Badge>}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={() => { haptic(); p.onEditProfile(); }} style={headBtn(false)}>
            <BrandIcon name="edit" size={18} strokeWidth={1.9} />{t('pf_edit')}
          </button>
          <button type="button" onClick={share} style={headBtn(true)}>
            <BrandIcon name="share" size={18} strokeWidth={2} />{t('pf_share')}
          </button>
        </div>
      </div>

      {/* Быстрые действия */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
        {tiles.filter((x) => x.show).map((x) => (
          <button key={x.title} type="button" onClick={() => { haptic(); x.onClick?.(); }} style={{
            ...card, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--tg-theme-text-color)',
            padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(127,127,127,0.14)',
            }}><BrandIcon name={x.icon} size={24} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{x.title}</span>
              <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', lineHeight: 1.3 }}>{x.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {p.servicesCount === 0 && !p.hideServicesWarning && (
        <div style={{ ...card, marginTop: 12, backgroundColor: 'rgba(255,149,0,0.1)', fontSize: 14 }}>{t('mp_no_services_warn')}</div>
      )}

      {/* Настройки */}
      <div style={{ ...card, marginTop: 12, padding: '0 14px' }}>
        <button type="button" onClick={() => { haptic(); p.onOpenReviews(); }} style={rowStyle(true)}>
          <BrandIcon name="star" />
          <span style={{ flex: 1 }}>{classes ? t('pf_reviews_students') : t('m_my_reviews')}</span>
          <span style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>{me && me.reviews_count > 0 ? me.reviews_count : t('pf_no_reviews')}</span>
        </button>
        <label style={{ ...rowStyle(false), position: 'relative' }}>
          <BrandIcon name="globe" />
          <span style={{ flex: 1 }}>{t('mp_language')}</span>
          <span style={{ color: 'var(--brand-ink)', fontWeight: 600, fontSize: 15 }}>{{ ru: 'Русский', uz: "O'zbekcha", en: 'English' }[lang]}</span>
          <select aria-label={t('mp_language')} value={lang} onChange={(e) => { haptic(); setLang(e.target.value as LangCode); }}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
            <option value="ru">Русский</option>
            <option value="uz">O'zbekcha</option>
            <option value="en">English</option>
          </select>
        </label>
        <button type="button" onClick={() => { haptic(); p.onSwitchToClient(); }} style={rowStyle(false)}>
          <BrandIcon name="eye" />
          <span style={{ flex: 1 }}>{classes ? t('pf_open_as_student') : t('m_login_as_client')}</span>
          {chevron}
        </button>
        <button type="button" onClick={() => { haptic(); p.onLogoutClick(); }} style={rowStyle(false)}>
          <BrandIcon name="logout" />
          <span style={{ flex: 1 }}>{t('m_logout')}</span>
        </button>
        <button type="button" onClick={() => { haptic(); p.onDeleteAccount(); }} style={rowStyle(false, true)}>
          <BrandIcon name="trash" />
          <span style={{ flex: 1 }}>{t('m_delete_account')}</span>
        </button>
      </div>
    </div>
  );
};

const headBtn = (primary: boolean): React.CSSProperties => ({
  height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  backgroundColor: primary ? 'var(--brand-accent)' : 'var(--brand-soft)', color: primary ? 'var(--brand-on-accent)' : 'var(--brand-ink)',
});
