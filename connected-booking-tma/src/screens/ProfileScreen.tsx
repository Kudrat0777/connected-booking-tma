import React, { useState } from 'react';
import { Tabbar } from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
} from '@vkontakte/icons';

type MainTab = 'bookings' | 'masters' | 'settings';

type Props = {
  telegramId: number;
  initialTab?: MainTab;
  onBack: () => void;
};

const tabs: { id: MainTab; text: string; Icon: React.ComponentType }[] = [
  { id: 'bookings', text: 'Записи', Icon: Icon28CalendarOutline },
  { id: 'masters', text: 'Мастера', Icon: Icon28UserStarBadgeOutline },
  { id: 'settings', text: 'Настройки', Icon: Icon28SettingsOutline },
];

export const ProfileScreen: React.FC<Props> = ({
  telegramId,
  initialTab = 'bookings',
  onBack,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);

  const renderContent = () => {
    if (currentTab === 'bookings') {
      return (
        <MyBookingsScreen telegramId={telegramId} onBack={onBack} />
      );
    }

    if (currentTab === 'masters') {
      return (
        <ScreenLayout title="Мастера" onBack={onBack}>
          <div>Здесь позже сделаем список избранных мастеров.</div>
        </ScreenLayout>
      );
    }

    if (currentTab === 'settings') {
      return (
        <ScreenLayout title="Настройки" onBack={onBack}>
          <div>Тут появятся настройки (уведомления, язык и т.п.).</div>
        </ScreenLayout>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>{renderContent()}</div>

      <Tabbar>
        {tabs.map(({ id, text, Icon }) => (
          <Tabbar.Item
            key={id}
            text={text}
            selected={id === currentTab}
            onClick={() => setCurrentTab(id)}
          >
            <Icon />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </div>
  );
};