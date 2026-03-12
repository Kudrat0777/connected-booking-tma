import React from 'react';
import { Title, Text, List, Section, Cell, Button } from '@telegram-apps/telegram-ui';
import {
  Icon28EditOutline,
  Icon28CalendarOutline,
  Icon28StatisticsOutline,
  Icon28FavoriteOutline,
  Icon28UserOutline,
  Icon28DoorArrowLeftOutline
} from '@vkontakte/icons';

type Props = {
  onEditProfile: () => void;
  onOpenSchedule: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onSwitchToClient: () => void;
  onLogoutClick: () => void;
  onDeleteAccount: () => void;
  triggerHaptic: (type?: 'light' | 'selection' | 'success' | 'warning') => void;
};

export const MasterProfileTab: React.FC<Props> = ({
  onEditProfile,
  onOpenSchedule,
  onOpenAnalytics,
  onOpenReviews,
  onSwitchToClient,
  onLogoutClick,
  onDeleteAccount,
  triggerHaptic
}) => {
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

       {/* Обернули в padding, чтобы секции стали красивыми "островками" */}
       <List style={{ padding: '0 16px' }}>
           <Section>
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

           <Section>
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
                   before={<Icon28UserOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
                   onClick={() => { triggerHaptic('selection'); onSwitchToClient(); }}
               >
                   Вернуться в режим клиента
               </Cell>
               <Cell
                   before={<Icon28DoorArrowLeftOutline style={{ color: 'var(--tg-theme-destructive-text-color)' }}/>}
                   onClick={onLogoutClick}
               >
                   <span style={{ color: 'var(--tg-theme-destructive-text-color)' }}>Выйти из аккаунта</span>
               </Cell>
           </Section>

           <div style={{ marginTop: 24, marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
               <Button mode="plain" size="s" onClick={onDeleteAccount} style={{ color: 'var(--tg-theme-hint-color)' }}>
                   Навсегда удалить аккаунт
               </Button>
           </div>
       </List>
    </div>
  );
};