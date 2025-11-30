import React, { useState } from 'react';
import {
  Tabbar,
  Button,
  Avatar,
} from '@telegram-apps/telegram-ui';
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

type Master = {
  id: number;
  name: string;
  specialty: string;
  description?: string;
  avatarUrl?: string;
  rating?: number; // 0–5
};

const tabs: { id: MainTab; text: string; Icon: React.ComponentType }[] = [
  { id: 'bookings', text: 'Записи', Icon: Icon28CalendarOutline },
  { id: 'masters', text: 'Мастера', Icon: Icon28UserStarBadgeOutline },
  { id: 'settings', text: 'Настройки', Icon: Icon28SettingsOutline },
];

const MOCK_MASTERS: Master[] = [
  {
    id: 1,
    name: 'Kudrat Sultanbaev',
    specialty: 'Барбер / стрижки',
    description: 'Фейд, классика, оформление бороды.',
    avatarUrl: 'https://i.imgur.com/892vhef.jpeg',
    rating: 4.9,
  },
  {
    id: 2,
    name: 'Dinara',
    specialty: 'Маникюр / педикюр',
    description: 'Аппаратный маникюр, выравнивание, дизайн.',
    avatarUrl: 'https://avatars.githubusercontent.com/u/84640980?v=4',
    rating: 4.8,
  },
];

// Очень компактный вывод рейтинга
const renderTinyRating = (rating?: number) => {
  if (!rating) return null;
  return (
    <span
      style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap',
      }}
    >
      ★ {rating.toFixed(1)}
    </span>
  );
};

export const ProfileScreen: React.FC<Props> = ({
  telegramId,
  initialTab = 'bookings',
  onBack,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);
  const [masters] = useState<Master[]>(MOCK_MASTERS);

  const handleMasterBook = (master: Master) => {
    // Здесь позже можно включить реальный флоу записи
    alert(`Запись к мастеру: ${master.name}`);
  };

  const renderMastersContent = () => {
    if (masters.length === 0) {
      return (
        <div style={{ padding: 16 }}>
          Пока мастера не добавлены. Обратитесь к администратору.
        </div>
      );
    }

    return (
      <div style={{ padding: 12 }}>
        {masters.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: 10,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: 10,
              display: 'flex',
              gap: 10,
            }}
          >
            {/* Аватар через TelegramUI Avatar */}
            <Avatar
              size={48}
              src={m.avatarUrl}
              fallbackName={m.name}
            />

            {/* Контент карточки */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Имя + маленький рейтинг одной строкой */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.name}
                </div>
                {renderTinyRating(m.rating)}
              </div>

              {/* Специализация */}
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: 2,
                }}
              >
                {m.specialty}
              </div>

              {/* Короткое описание, максимум 2 строки */}
              {m.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {m.description}
                </div>
              )}

              {/* Кнопка действия */}
              <Button
                mode="filled"
                size="s"
                onClick={() => handleMasterBook(m)}
                style={{ width: '100%' }}
              >
                Записаться
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (currentTab === 'bookings') {
      return (
        <MyBookingsScreen telegramId={telegramId} onBack={onBack} />
      );
    }

    if (currentTab === 'masters') {
      return (
        <ScreenLayout title="Мастера" onBack={onBack}>
          {renderMastersContent()}
        </ScreenLayout>
      );
    }

    if (currentTab === 'settings') {
      return (
        <ScreenLayout title="Настройки" onBack={onBack}>
          <div style={{ padding: 16 }}>
            Здесь позже появятся настройки (язык, уведомления и т.п.).
          </div>
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