import React from 'react';
import { List, Section, Cell, Title, Text, Button, Select } from '@telegram-apps/telegram-ui';
import {
  Icon28EditOutline,
  Icon28CalendarOutline,
  Icon28StatisticsOutline,
  Icon28FavoriteOutline,
  Icon28UserCircleOutline,
  Icon28ArrowRightSquareOutline,
  Icon28DeleteOutline,
  Icon28ShareOutline,
  Icon28CopyOutline
} from '@vkontakte/icons';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';

type Props = {
  telegramId?: number;
  onEditProfile: () => void;
  onOpenSchedule: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onSwitchToClient: () => void;
  onLogoutClick: () => void;
  onDeleteAccount: () => void;
  triggerHaptic: (type?: 'light' | 'selection' | 'success' | 'warning') => void;
};

const BOT_USERNAME = 'ConnectedTimeBot';
const APP_SHORT_NAME = 'booking';

export const MasterProfileTab: React.FC<Props> = ({
  telegramId,
  onEditProfile,
  onOpenSchedule,
  onOpenAnalytics,
  onOpenReviews,
  onSwitchToClient,
  onLogoutClick,
  onDeleteAccount,
  triggerHaptic
}) => {

  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { lang, setLang, t } = useLanguage();

  const tg = (window as any).Telegram?.WebApp;
  const currentMasterId = telegramId || tg?.initDataUnsafe?.user?.id;

  const shareLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=master_${currentMasterId}`;

  const handleCopyLink = () => {
    triggerHaptic('light');
    if (!currentMasterId) {
        if (tg?.showAlert) tg.showAlert(t('m_copy_error'));
        else alert(t('m_copy_error'));
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareLink).then(() => {
            triggerHaptic('success');
            if (tg?.showAlert) {
                tg.showAlert(t('m_copy_success_alert'));
            } else {
                alert(t('m_copy_success'));
            }
        }).catch(() => fallbackCopyTextToClipboard(shareLink));
    } else {
        fallbackCopyTextToClipboard(shareLink);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      triggerHaptic('success');
      if (tg?.showAlert) tg.showAlert(t('m_copy_success_alert'));
      else alert(t('m_copy_success'));
    } catch (err) {
      console.error('Copy fallback failed', err);
      prompt(t('m_copy_fallback'), text);
    }
    document.body.removeChild(textArea);
  };

  const handleShareLink = () => {
    triggerHaptic('light');
    const text = t('m_share_text');
    const fullShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) {
        tg.openTelegramLink(fullShareUrl);
    } else {
        window.open(fullShareUrl, '_blank');
    }
  };

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

           <Section header={t('m_client_acquisition')}>
               <div style={{ padding: '16px', backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: 12, marginBottom: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                   <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-theme-text-color)', marginBottom: 8 }}>
                       {t('m_your_link')}
                   </div>
                   <div style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', wordBreak: 'break-all', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '10px 12px', borderRadius: 8, marginBottom: 16 }}>
                       {shareLink}
                   </div>
                   <div style={{ display: 'flex', gap: 8 }}>
                       <Button size="m" mode="bezeled" stretched before={<Icon28CopyOutline width={20} height={20}/>} onClick={handleCopyLink}>
                           {t('m_btn_copy')}
                       </Button>
                       <Button size="m" mode="filled" stretched before={<Icon28ShareOutline width={20} height={20}/>} onClick={handleShareLink}>
                           {t('m_btn_forward')}
                       </Button>
                   </div>
               </div>
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