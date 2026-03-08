import React, { useState, useRef, useEffect } from 'react';
import {
  Tabbar,
  Button,
  Avatar,
  List,
  Section,
  Cell,
  Input,
  Placeholder,
  Spinner,
  Headline,
  Subheadline,
  Text,
} from '@telegram-apps/telegram-ui';
import '../css/ProfileScreen.css';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search,
  Icon28ChevronRightOutline,
  Icon24LocationOutline,
  Icon28SlidersOutline
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
      {/* Search and Filters Header */}
      <header className="masters-fixed-header">
        <div className="location-row" onClick={() => {/* logic */}}>
          <Icon24LocationOutline className="accent-icon" />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="native-city-select"
          >
            {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
          <Icon28ChevronRightOutline className="dropdown-chevron" />
        </div>

        <Input
          placeholder="Имя специалиста или услуга"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          before={<Icon24Search className="input-icon" />}
          className="modern-input"
        />

        <div className="horizontal-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`chip-button ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Content Area */}
      <div className="scrollable-content">
        {loading ? (
          <div className="centered-state"><Spinner size="l" /></div>
        ) : masters.length === 0 ? (
          <Placeholder
            header="Специалисты не найдены"
            description="Попробуйте изменить параметры фильтра"
          >
            <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        ) : (
          <List className="masters-list">
            {masters.map((m) => (
              <Section key={m.id} className="master-card-section">
                <Cell
                  onClick={() => onGoToServices?.(m.id, m.name)}
                  before={<Avatar size={56} src={getFullImageUrl(m.avatar_url)} />}
                  after={<Icon28ChevronRightOutline className="cell-chevron" />}
                  subhead={m.bio || 'Мастер'}
                  description={
                    <div className="master-metadata">
                      {m.rating > 0 && <span className="rating-pill">⭐ {m.rating.toFixed(1)}</span>}
                      {m.address && <span className="address-text">📍 {m.address}</span>}
                    </div>
                  }
                  multiline
                >
                  <Headline weight="2">{m.name}</Headline>
                </Cell>

                <footer className="card-footer-actions">
                  <Button
                    mode="bezeled"
                    size="m"
                    stretched
                    onClick={(e) => { e.stopPropagation(); onOpenPortfolio?.(m.id, m.name); }}
                  >
                    Портфолио
                  </Button>
                  <Button
                    mode="filled"
                    size="m"
                    stretched
                    onClick={(e) => { e.stopPropagation(); onGoToServices?.(m.id, m.name); }}
                  >
                    Записаться
                  </Button>
                </footer>
              </Section>
            ))}
          </List>
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