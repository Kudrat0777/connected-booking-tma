import React, { useEffect, useState } from 'react';
import { List, Section, Cell, Title, Text, Select } from '@telegram-apps/telegram-ui';
import {
  Icon28EditOutline,
  Icon28CalendarOutline,
  Icon28StatisticsOutline,
  Icon28FavoriteOutline,
  Icon28UserCircleOutline,
  Icon28ArrowRightSquareOutline,
  Icon28DeleteOutline,
  Icon28ShareOutline,
  Icon28UsersOutline,
  Icon28CalendarCheckOutline,
  Icon28UserCardOutline
} from '@vkontakte/icons';
import { fetchCurrentMaster, CurrentMaster } from '../helpers/api';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';

type Props = {
  telegramId?: number;
  onEditProfile: () => void;
  onOpenSchedule: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onOpenLinks?: () => void;
  onOpenTeam?: () => void;
  onOpenSalonCalendar?: () => void;
  onOpenClients?: () => void;
  onSwitchToClient: () => void;
  onLogoutClick: () => void;
  onDeleteAccount: () => void;
  triggerHaptic: (type?: 'light' | 'selection' | 'success' | 'warning') => void;
};


export const MasterProfileTab: React.FC<Props> = ({
  telegramId,
  onEditProfile,
  onOpenSchedule,
  onOpenAnalytics,
  onOpenReviews,
  onOpenLinks,
  onOpenTeam,
  onOpenSalonCalendar,
  onOpenClients,
  onSwitchToClient,
  onLogoutClick,
  onDeleteAccount,
  triggerHaptic
}) => {

  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { lang, setLang, t } = useLanguage();

  const tg = (window as any).Telegram?.WebApp;
  void telegramId;

  const [me, setMe] = useState<CurrentMaster | null>(null);
  useEffect(() => { fetchCurrentMaster().then(setMe).catch(() => {}); }, []);
  const isTeam = me?.business?.kind === 'team';
  const canManageTeam = me?.role === 'owner' || me?.role === 'admin';

  const iconBox = (bg: string, icon: React.ReactNode) => (
    <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
  );

  return (
    <div style={{ minHeight: '100%', paddingBottom: 100 }}>
       <div style={{ padding: '32px 20px 16px' }}>
           <Title
               level="1"
               weight="1"
               style={{ marginBottom: 8, color: 'var(--tg-theme-text-color)', backgroundColor: 'transparent' }}
           >
               {t('m_profile_title')}
           </Title>
           <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, display: 'block' }}>
               {t('m_profile_desc')}
           </Text>
       </div>

       <List style={{ padding: '0 16px' }}>

           {/* ================= ВЫБОР ЯЗЫКА ================= */}
           <Section>
               <Select
                  header="Language / Язык / Til"
                  value={lang}
                  onChange={(e) => {
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                      setLang(e.target.value as LangCode);
                  }}
               >
                  <option value="en">🇬🇧 English</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="uz">🇺🇿 O'zbekcha</option>
               </Select>
           </Section>

           {me?.business && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 8, borderRadius: 12, backgroundColor: 'var(--tg-theme-bg-color)' }}>
                   <span style={{ fontSize: 22 }}>{isTeam ? '🏠' : '✂️'}</span>
                   <div style={{ minWidth: 0 }}>
                       <div style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>{me.business.name}</div>
                       <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                           {isTeam ? t(`roles_${me.role}`) : t('solo_master')}
                       </div>
                   </div>
               </div>
           )}

           {isTeam && (
               <Section>
                   <Cell
                       before={iconBox('rgba(255, 149, 0, 0.12)', <Icon28CalendarCheckOutline width={24} height={24} style={{ color: '#FF9500' }} />)}
                       onClick={() => { triggerHaptic('selection'); onOpenSalonCalendar?.(); }}
                       description={t('prof_calendar_desc')}
                   >
                       {t('prof_calendar')}
                   </Cell>
               </Section>
           )}

           <Section>
               <Cell
                   before={iconBox('rgba(80, 200, 120, 0.15)', <Icon28UserCardOutline width={24} height={24} style={{ color: '#50C878' }} />)}
                   onClick={() => { triggerHaptic('selection'); onOpenClients?.(); }}
                   description={t('prof_clients_desc')}
               >
                   {t('prof_clients')}
               </Cell>
           </Section>

           <Section header={t('m_client_acquisition')}>
               <Cell
                   before={iconBox('rgba(80, 200, 120, 0.15)', <Icon28ShareOutline width={24} height={24} style={{ color: '#50C878' }} />)}
                   onClick={() => { triggerHaptic('selection'); onOpenLinks?.(); }}
                   description={t('prof_links_desc')}
               >
                   {t('prof_links')}
               </Cell>
               {(isTeam || canManageTeam) && (
                   <Cell
                       before={iconBox('rgba(88, 86, 214, 0.12)', <Icon28UsersOutline width={24} height={24} style={{ color: '#5856D6' }} />)}
                       onClick={() => { triggerHaptic('selection'); onOpenTeam?.(); }}
                       description={canManageTeam ? t('prof_team_desc_manage') : t('prof_team_desc')}
                   >
                       {t('prof_team')}
                   </Cell>
               )}
           </Section>

           <Section header={t('m_management')}>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28EditOutline width={24} height={24} style={{ color: '#007AFF' }} /></div>}
                   onClick={() => { triggerHaptic('selection'); onEditProfile(); }}
                   description={t('m_edit_profile_desc')}
               >
                   {t('m_edit_profile')}
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28CalendarOutline width={24} height={24} style={{ color: '#FF9500' }} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenSchedule(); }}
                   description={t('m_manage_schedule_desc')}
               >
                   {t('m_manage_schedule')}
               </Cell>
           </Section>

           <Section header={t('m_analytics')}>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28StatisticsOutline width={24} height={24} style={{ color: '#34C759' }} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenAnalytics(); }}
               >
                   {t('m_statistics')}
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 45, 85, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28FavoriteOutline width={24} height={24} style={{ color: '#FF2D55' }} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenReviews(); }}
               >
                   {t('m_my_reviews')}
               </Cell>
           </Section>

           <Section header={t('m_system')}>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28UserCircleOutline width={24} height={24} style={{ color: '#007AFF' }} /></div>}
                   onClick={() => { triggerHaptic('selection'); onSwitchToClient(); }}
               >
                   {t('m_login_as_client')}
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28ArrowRightSquareOutline width={24} height={24} style={{ color: '#FF9500' }} /></div>}
                   onClick={() => { triggerHaptic('warning'); onLogoutClick(); }}
               >
                   {t('m_logout')}
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28DeleteOutline width={24} height={24} style={{ color: '#FF3B30' }} /></div>}
                   onClick={() => { triggerHaptic('warning'); onDeleteAccount(); }}
                   style={{ color: '#FF3B30' }}
               >
                   {t('m_delete_account')}
               </Cell>
           </Section>
       </List>
    </div>
  );
};