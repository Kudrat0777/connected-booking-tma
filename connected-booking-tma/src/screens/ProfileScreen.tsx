import React, { useState, useRef, useEffect } from 'react';
import {
  Tabbar,
  Button,
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
  Icon28ChevronRightOutline,
  Icon24LocationOutline,
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
  onOpenMasterReviews?: (masterId: number) => void;
  onOpenPortfolio?: (masterId: number, masterName: string) => void;
};

const tabs: { id: MainTab; text: string; Icon: React.ComponentType<any> }[] = [
  { id: 'bookings', text: 'Записи', Icon: Icon28CalendarOutline },
  { id: 'masters', text: 'Мастера', Icon: Icon28UserStarBadgeOutline },
  { id: 'settings', text: 'Настройки', Icon: Icon28SettingsOutline },
];

const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];
const CATEGORIES = ['Все', 'Барбер', 'Стрижка', 'Маникюр', 'Ресницы', 'Массаж', 'Брови', 'Макияж'];

export const ProfileScreen: React.FC<Props> = ({
  telegramId,
  initialTab = 'bookings',
  onBack,
  onLogout,
  onGoToServices,
  onReview,
  onOpenMasterReviews,
  onOpenPortfolio,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);
  const [masters, setMasters] = useState<MasterPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Ургенч');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentTab === 'masters') {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      const timeout = setTimeout(() => {
        setLoading(true);
        fetchMasters({
            search: search.trim() !== '' ? search.trim() : undefined,
            city: selectedCity,
            specialization: selectedCategory !== 'Все' ? selectedCategory : undefined,
            ordering: 'rating'
        })
          .then(setMasters)
          .catch(console.error)
          .finally(() => setLoading(false));
      }, 500);
      setDebounceTimeout(timeout);
    }
    return () => { if (debounceTimeout) clearTimeout(debounceTimeout); };
  }, [currentTab, search, selectedCity, selectedCategory]);

  const renderMastersContent = () => (
    <div className="masters-page-root">
      <header className="masters-fixed-header">
        <div className="location-row">
          <Icon24LocationOutline width={18} height={18} />
          <span className="city-label">{selectedCity}</span>
          <Icon28ChevronRightOutline width={16} height={16} style={{ transform: 'rotate(90deg)' }} />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="native-city-select"
          >
            {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        {/* ЧИСТЫЙ КАСТОМНЫЙ ПОИСК */}
        <div className="custom-search-wrapper">
          <div className="custom-search-container">
            <Icon24Search width={20} height={20} style={{ color: 'var(--tg-theme-hint-color)' }} />
            <input
              type="text"
              className="custom-search-input"
              placeholder="Поиск мастера или услуги"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="horizontal-chips">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              size="s"
              mode={selectedCategory === cat ? 'filled' : 'bezeled'}
              onClick={() => setSelectedCategory(cat)}
              style={{ flexShrink: 0, borderRadius: 100 }}
            >
              {cat}
            </Button>
          ))}
        </div>
      </header>

      <div className="scrollable-content">
        {loading ? (
          <div className="centered-state"><Spinner size="l" /></div>
        ) : masters.length === 0 ? (
          <Placeholder
            header="Никого не нашли"
            description="Попробуйте изменить город или фильтры"
          >
            <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        ) : (
          <div style={{ padding: '0 16px 16px 16px' }}>
            {masters.map((m) => (
              <Card
                key={m.id}
                type="plain"
                style={{ marginBottom: 16, backgroundColor: 'var(--tg-theme-bg-color)' }}
              >
                <React.Fragment>
                  {/* Вызываем Chip через точку, чтобы не было ошибки импорта */}
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
                      height: 240,
                      objectFit: 'cover',
                      width: '100%'
                    }}
                  />

                  {/* Вызываем Cell через точку */}
                  <Card.Cell
                    readOnly
                    subtitle={m.address ? `📍 ${m.address}` : m.bio || 'Мастер'}
                  >
                    {m.name}
                  </Card.Cell>

                  {/* Кнопки вынесены вниз карточки */}
                  <div className="card-buttons">
                    <Button
                      mode="bezeled"
                      size="m"
                      stretched
                      onClick={() => onOpenPortfolio?.(m.id, m.name)}
                    >
                      Портфолио
                    </Button>
                    <Button
                      mode="filled"
                      size="m"
                      stretched
                      onClick={() => onGoToServices?.(m.id, m.name)}
                    >
                      Записаться
                    </Button>
                  </div>
                </React.Fragment>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tma-container">
      <main className="main-viewport">
        {currentTab === 'bookings' && <MyBookingsScreen telegramId={telegramId} onReview={onReview} />}
        {currentTab === 'masters' && renderMastersContent()}
        {currentTab === 'settings' && <SettingsScreen telegramId={telegramId} onLogout={onLogout} />}
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