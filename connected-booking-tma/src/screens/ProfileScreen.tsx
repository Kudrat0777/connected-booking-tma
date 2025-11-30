import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Tabbar,
  Button,
  Avatar,
  List,
  Input,
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
} from '@vkontakte/icons';
import lottie, { AnimationItem } from 'lottie-web';

type MainTab = 'bookings' | 'masters' | 'settings';

type Props = {
  telegramId: number;
  initialTab?: MainTab;
  onBack: () => void;
  onGoToServices?: (masterName?: string) => void;
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
  onGoToServices,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);
  const [masters] = useState<Master[]>(MOCK_MASTERS);
  const [search, setSearch] = useState<string>('');

  const handleMasterBook = (master: Master) => {
    if (onGoToServices) {
      onGoToServices(master.name);
    }
  };

  // Поиск по имени, спецу и описанию (регистр не важен)
  const filteredMasters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => {
      const inName = m.name.toLowerCase().includes(q);
      const inSpec = m.specialty.toLowerCase().includes(q);
      const inDesc = m.description
        ? m.description.toLowerCase().includes(q)
        : false;
      return inName || inSpec || inDesc;
    });
  }, [masters, search]);

  // --- Lottie для пустого состояния поиска ---
  const emptyLottieContainerRef = useRef<HTMLDivElement | null>(null);
  const emptyLottieInstanceRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    // Инициализируем анимацию только если контейнер есть
    if (!emptyLottieContainerRef.current) return;

    // Чистим предыдущую
    if (emptyLottieInstanceRef.current) {
      emptyLottieInstanceRef.current.destroy();
      emptyLottieInstanceRef.current = null;
    }

    const anim = lottie.loadAnimation({
      container: emptyLottieContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/stickers/duck_out.json',
    });

    emptyLottieInstanceRef.current = anim;

    return () => {
      anim.destroy();
    };
  }, []); // один раз при монтировании экрана

  const renderMastersContent = () => {
    const list = filteredMasters;
    const hasQuery = Boolean(search.trim());

    return (
      <div style={{ padding: 12 }}>
        {/* Поисковая строка */}
        <List
          style={{
            marginBottom: 12,
            background: 'var(--tgui--secondary_bg_color)',
            borderRadius: 12,
          }}
        >
          <Input
            header="Поиск по мастерам и услугам"
            placeholder="Имя, услуга, описание..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </List>

        {/* Пустое состояние, если никого не нашли */}
        {hasQuery && list.length === 0 && (
          <div
            style={{
              padding: '32px 16px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <div
              ref={emptyLottieContainerRef}
              style={{ width: 160, height: 160 }}
              aria-hidden="true"
            />

            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              Ничего не найдено
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 260,
              }}
            >
              Попробуйте изменить запрос или очистить поле поиска.
            </div>
          </div>
        )}

        {list.length > 0 &&
          list.map((m) => (
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
              <Avatar
                size={48}
                src={m.avatarUrl}
                fallbackName={m.name}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
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

                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    marginBottom: 2,
                  }}
                >
                  {m.specialty}
                </div>

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
        <MyBookingsScreen
          telegramId={telegramId}
          onBack={onBack}
          onGoToServices={onGoToServices}
        />
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