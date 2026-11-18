import React, { useEffect, useState } from 'react';
import { Tabbar } from '@telegram-apps/telegram-ui';
import { Icon28HomeOutline, Icon28CalendarOutline, Icon28UserCircleOutline } from '@vkontakte/icons';

import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import { ClientHomeScreen } from './ClientHomeScreen';
import type { Booking } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';

// 'masters' — главная (поиск и запись), 'bookings' — мои записи, 'settings' — профиль
type MainTab = 'bookings' | 'masters' | 'settings';

type Props = {
  telegramId: number;
  initialTab?: MainTab;
  onBack: () => void;
  onLogout?: () => void;
  onOpenMasterProfile?: (masterId: number, masterName: string) => void;
  onReview?: (booking: Booking) => void;
  onOpenMasterReviews?: (id: number) => void;
  onOpenPortfolio?: (id: number, name: string) => void;
};

export const ProfileScreen: React.FC<Props> = ({
  telegramId,
  initialTab = 'masters',
  onBack,
  onLogout,
  onOpenMasterProfile,
  onReview,
}) => {
  const { t } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const firstName: string | undefined = tg?.initDataUnsafe?.user?.first_name;
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);

  const tabs: { id: MainTab; text: string; Icon: React.ComponentType<any> }[] = [
    { id: 'masters', text: t('tab_home'), Icon: Icon28HomeOutline },
    { id: 'bookings', text: t('tab_bookings'), Icon: Icon28CalendarOutline },
    { id: 'settings', text: t('tab_profile'), Icon: Icon28UserCircleOutline },
  ];

  // На главных вкладках системные кнопки Telegram не нужны
  useEffect(() => {
    if (!tg) return;
    tg.BackButton.hide();
    tg.MainButton?.hide();
  }, [currentTab, tg]);

  const open = (masterId: number, name: string) => onOpenMasterProfile?.(masterId, name);

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
      <main style={{ height: '100%', overflowY: 'auto' }}>
        {currentTab === 'masters' && (
          <ClientHomeScreen telegramId={telegramId} firstName={firstName} onOpenMaster={open}
            onOpenBookings={() => setCurrentTab('bookings')} />
        )}
        {currentTab === 'bookings' && (
          <MyBookingsScreen telegramId={telegramId} onReview={onReview} onBack={onBack}
            onOpenMaster={open} onGoToServices={() => setCurrentTab('masters')} />
        )}
        {currentTab === 'settings' && <SettingsScreen telegramId={telegramId} onBack={onBack} onLogout={onLogout} />}
      </main>

      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        {tabs.map(({ id, text, Icon }) => (
          <Tabbar.Item key={id} text={text} selected={id === currentTab}
            onClick={() => { if (id !== currentTab) tg?.HapticFeedback?.selectionChanged(); setCurrentTab(id); }}>
            <Icon />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </div>
  );
};

export default ProfileScreen;
