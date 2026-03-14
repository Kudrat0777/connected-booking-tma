import React from 'react';
import { List, Section, Cell, Title, Text, Button } from '@telegram-apps/telegram-ui';
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

type Props = {
  telegramId?: number; // Добавили telegramId в пропсы
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

  // Безопасное получение ID: из пропсов, либо из объекта Telegram
  const tg = (window as any).Telegram?.WebApp;
  const currentMasterId = telegramId || tg?.initDataUnsafe?.user?.id;

  // Формируем правильную ссылку на Mini App
  const shareLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=master_${currentMasterId}`;

  const handleCopyLink = () => {
    triggerHaptic('light');
    if (!currentMasterId) {
        if (tg?.showAlert) tg.showAlert('Не удалось определить ваш ID.');
        else alert('Не удалось определить ваш ID.');
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareLink).then(() => {
            triggerHaptic('success');
            if (tg?.showAlert) {
                tg.showAlert('Ссылка скопирована! Вставьте её в шапку профиля Instagram или отправьте клиентам.');
            } else {
                alert('Ссылка скопирована!');
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
      if (tg?.showAlert) tg.showAlert('Ссылка скопирована! Вставьте её в шапку профиля Instagram.');
      else alert('Ссылка скопирована!');
    } catch (err) {
      console.error('Copy fallback failed', err);
      prompt('Скопируйте эту ссылку вручную:', text);
    }
    document.body.removeChild(textArea);
  };

  const handleShareLink = () => {
    triggerHaptic('light');
    const text = `Привет! Записывайся ко мне онлайн через Telegram 💅✂️`;
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
               Мой кабинет
           </Title>
           <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, display: 'block' }}>
               Управляйте своим профилем, расписанием и настройками.
           </Text>
       </div>

       <List style={{ padding: '0 16px' }}>

           {/* НОВЫЙ БЛОК: ССЫЛКА ДЛЯ КЛИЕНТОВ */}
           <Section header="Привлечение клиентов">
               <div style={{ padding: '16px', backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: 12, marginBottom: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                   <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-theme-text-color)', marginBottom: 8 }}>
                       Ваша персональная ссылка:
                   </div>
                   <div style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', wordBreak: 'break-all', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '10px 12px', borderRadius: 8, fontFamily: 'monospace', marginBottom: 12 }}>
                       {shareLink}
                   </div>
                   <div style={{ display: 'flex', gap: 8 }}>
                       <Button size="m" mode="bezeled" stretched before={<Icon28CopyOutline width={20} height={20}/>} onClick={handleCopyLink}>
                           Копировать
                       </Button>
                       <Button size="m" mode="filled" stretched before={<Icon28ShareOutline width={20} height={20}/>} onClick={handleShareLink}>
                           Переслать
                       </Button>
                   </div>
               </div>
           </Section>

           <Section header="Управление">
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28EditOutline width={24} height={24} style={{ color: '#007AFF'}} /></div>}
                   onClick={() => { triggerHaptic('selection'); onEditProfile(); }}
                   description="Имя, фото, контакты, портфолио"
               >
                   Редактировать профиль
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28CalendarOutline width={24} height={24} style={{ color: '#FF9500'}} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenSchedule(); }}
                   description="Генерация свободных слотов"
               >
                   Управление расписанием
               </Cell>
           </Section>

           <Section header="Аналитика">
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28StatisticsOutline width={24} height={24} style={{ color: '#34C759'}} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenAnalytics(); }}
               >
                   Статистика
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 45, 85, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28FavoriteOutline width={24} height={24} style={{ color: '#FF2D55'}} /></div>}
                   onClick={() => { triggerHaptic('selection'); onOpenReviews(); }}
               >
                   Мои отзывы
               </Cell>
           </Section>

           <Section header="Система">
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28UserCircleOutline width={24} height={24} style={{ color: '#007AFF'}} /></div>}
                   onClick={() => { triggerHaptic('selection'); onSwitchToClient(); }}
               >
                   Войти как клиент
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28ArrowRightSquareOutline width={24} height={24} style={{ color: '#FF9500'}} /></div>}
                   onClick={() => { triggerHaptic('warning'); onLogoutClick(); }}
               >
                   Выйти из аккаунта
               </Cell>
               <Cell
                   before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28DeleteOutline width={24} height={24} style={{ color: '#FF3B30'}} /></div>}
                   onClick={() => { triggerHaptic('warning'); onDeleteAccount(); }}
                   style={{ color: '#FF3B30' }}
               >
                   Удалить аккаунт
               </Cell>
           </Section>
       </List>
    </div>
  );
};