import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Tabbar,
  Button,
  Avatar,
  List,
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import SettingsScreen from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
} from '@vkontakte/icons';
import lottie, { AnimationItem } from 'lottie-web';
import '../css/ProfileScreen.css';

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

const renderTinyRating = (rating?: number) => {
  if (!rating) return null;
  return (
    <span className="ps-tiny-rating">
      ★ {rating.toFixed(1)}
    </span>
  );
};

const PreparedSection: React.FC<{
  label: string;
  onClick?: () => void;
}> = ({ label, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="ps-prepared-row"
      role={onClick ? 'button' : undefined}
    >
      <div className="ps-prepared-row__label">{label}</div>
    </div>
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

  const list = filteredMasters;
  const hasQuery = Boolean(search.trim());
  const isEmptyResult = hasQuery && list.length === 0;

  // Lottie для пустого состояния поиска
  const emptyLottieContainerRef = useRef<HTMLDivElement | null>(null);
  const emptyLottieInstanceRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!isEmptyResult) {
      if (emptyLottieInstanceRef.current) {
        emptyLottieInstanceRef.current.destroy();
        emptyLottieInstanceRef.current = null;
      }
      return;
    }

    if (!emptyLottieContainerRef.current) {
      return;
    }

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
      emptyLottieInstanceRef.current = null;
    };
  }, [isEmptyResult]);

  const renderMastersContent = () => {
    return (
      <div className="ps-outer" style={{ padding: 12 }}>
        {/* Упрощённый аккуратный input — без предложений */}
        <List style={{ marginBottom: 12, background: 'transparent' }}>
          <div className="ps-search-wrap">
            <div className="ps-search-label">Поиск по мастерам и услугам</div>

            <div className="ps-search-input">
              <input
                placeholder="Имя, услуга, описание..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-input-field"
              />
            </div>
            {/* Предложения выключены */}
          </div>
        </List>

        {/* Пустое состояние, если никого не нашли */}
        {isEmptyResult && (
          <div className="ps-empty">
            <div ref={emptyLottieContainerRef} className="ps-empty__anim" aria-hidden="true" />
            <div className="ps-empty__title">Ничего не нашли</div>
            <div className="ps-empty__desc">Попробуйте изменить запрос или очистить поле поиска.</div>
          </div>
        )}

        {/* Список мастеров */}
        {(!hasQuery || list.length > 0) &&
          list.map((m) => (
            <div key={m.id} className="ps-master-row">
              <Avatar size={48} src={m.avatarUrl} fallbackName={m.name} />
              <div className="ps-master-body">
                <div className="ps-master-head">
                  <div className="ps-master-name">{m.name}</div>
                  {renderTinyRating(m.rating)}
                </div>

                <div className="ps-master-spec">{m.specialty}</div>

                {m.description && <div className="ps-master-desc">{m.description}</div>}

                <Button mode="filled" size="s" onClick={() => handleMasterBook(m)} style={{ width: '100%' }}>
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
        <MyBookingsScreen telegramId={telegramId} onBack={onBack} onGoToServices={onGoToServices} />
      );
    }

    if (currentTab === 'masters') {
      // ВАЖНО: здесь вызываем renderMastersContent(), чтобы показать поиск и список мастеров
      return (
        <ScreenLayout title="Мастера" onBack={onBack}>
          {renderMastersContent()}
        </ScreenLayout>
      );
    }

    if (currentTab === 'settings') {
      return (
        <SettingsScreen
          telegramId={telegramId}
          onBack={onBack}
          onLogout={() => {
            // простой logout placeholder — добавь логику выхода
            console.log('logout');
          }}
        />
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0 }}>{renderContent()}</div>

      <Tabbar>
        {tabs.map(({ id, text, Icon }) => (
          <Tabbar.Item key={id} text={text} selected={id === currentTab} onClick={() => setCurrentTab(id)}>
            <Icon />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </div>
  );
};

export default ProfileScreen;