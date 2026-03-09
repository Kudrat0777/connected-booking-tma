import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tabbar,
  Placeholder,
  Spinner,
  Card,
} from '@telegram-apps/telegram-ui';

import '../css/ProfileScreen.css';
import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search,
  Icon24LocationOutline,
  Icon28ChevronRightOutline
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasters, getFullImageUrl } from '../helpers/api';
import type { MasterPublicProfile, Booking } from '../helpers/api';

const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      return () => anim.destroy();
    } catch (e) { console.error(e); }
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type MainTab = 'bookings' | 'masters' | 'settings';

type Props = {
  telegramId: number;
  initialTab?: MainTab;
  onBack: () => void;
  onLogout?: () => void;
  onGoToServices?: (masterId: number, masterName: string) => void;
  onReview?: (booking: Booking) => void;
};

const tabs: { id: MainTab; text: string; Icon: React.ComponentType<any> }[] = [
  { id: 'bookings', text: 'Записи', Icon: Icon28CalendarOutline },
  { id: 'masters', text: 'Мастера', Icon: Icon28UserStarBadgeOutline },
  { id: 'settings', text: 'Настройки', Icon: Icon28SettingsOutline },
];

const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];

export const ProfileScreen: React.FC<Props> = ({
  telegramId,
  initialTab = 'bookings',
  onBack,
  onLogout,
  onGoToServices,
  onReview,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);
  const [masters, setMasters] = useState<MasterPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Ургенч');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentTab === 'masters') {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      const timeout = setTimeout(() => {
        setLoading(true);
        fetchMasters({
            search: search.trim() !== '' ? search.trim() : undefined,
            city: selectedCity,
            ordering: 'rating'
        })
          .then(setMasters)
          .catch(console.error)
          .finally(() => setLoading(false));
      }, 500);
      setDebounceTimeout(timeout);
    }
    return () => { if (debounceTimeout) clearTimeout(debounceTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, search, selectedCity]);

  const groupedMasters = useMemo(() => {
    const groups: Record<string, MasterPublicProfile[]> = {};
    masters.forEach(m => {
        const cat = (m as any).specialization || 'Рекомендуемые';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(m);
    });
    return groups;
  }, [masters]);

  const renderMastersContent = () => (
    <div className="masters-page-root">

      <header className="masters-fixed-header">
        {/* КАСТОМНЫЙ ПРОЗРАЧНЫЙ ПОИСК */}
        <div className="custom-search-container">
            <Icon24Search width={20} height={20} style={{ color: 'var(--tg-theme-hint-color)' }} />
            <input
              type="text"
              className="custom-search-input"
              placeholder="Поиск мастера или услуги..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        {/* НАТИВНАЯ КНОПКА ВЫБОРА ГОРОДА */}
        <div className="city-selector">
          <div className="city-selector-content">
             <Icon24LocationOutline style={{ color: 'var(--tg-theme-hint-color)' }} />
             <span className="city-selector-label">{selectedCity}</span>
          </div>
          <Icon28ChevronRightOutline width={20} height={20} style={{ transform: 'rotate(90deg)', color: 'var(--tg-theme-hint-color)' }} />

          {/* Невидимый нативный селект */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="native-city-select"
          >
            {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
      </header>

      <div className="scrollable-content">
        {loading ? (
          <div className="centered-state"><Spinner size="l" /></div>
        ) : masters.length === 0 ? (
          <Placeholder
            header="Никого не нашли"
            description="Попробуйте изменить город или поисковой запрос"
          >
            <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        ) : (
          <div>
             {Object.entries(groupedMasters).map(([categoryName, catMasters]) => (
                <div key={categoryName} className="category-group">
                   <h3 className="category-title">{categoryName}</h3>

                   <div className="category-scroll">
                      {catMasters.map(m => (
                         <Card
                           key={m.id}
                           onClick={() => onGoToServices?.(m.id, m.name)}
                           style={{
                             width: 140,
                             flexShrink: 0,
                             cursor: 'pointer',
                             border: '1px solid var(--tg-theme-secondary-bg-color)'
                           }}
                         >
                            <React.Fragment>
                              {m.rating > 0 && (
                                <Card.Chip readOnly>
                                  ⭐ {m.rating.toFixed(1)}
                                </Card.Chip>
                              )}

                              <img
                                alt={m.name}
                                src={getFullImageUrl(m.avatar_url)}
                                style={{
                                  display: 'block',
                                  height: 140,
                                  objectFit: 'cover',
                                  width: '100%'
                                }}
                              />

                              <Card.Cell
                                readOnly
                                subtitle={m.bio || 'Специалист'}
                              >
                                <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                              </Card.Cell>
                            </React.Fragment>
                         </Card>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tma-container">
      <main className="main-viewport">
        {currentTab === 'bookings' && <MyBookingsScreen telegramId={telegramId} onReview={onReview} onBack={onBack} onGoToServices={() => setCurrentTab('masters')} />}
        {currentTab === 'masters' && renderMastersContent()}
        {currentTab === 'settings' && <SettingsScreen telegramId={telegramId} onBack={onBack} onLogout={onLogout} />}
      </main>

      <Tabbar className="system-tabbar">
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

export default ProfileScreen;