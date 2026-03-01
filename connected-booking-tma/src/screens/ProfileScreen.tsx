import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Select // Импортируем Select для выбора города
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search,
  Icon28ChevronRightOutline,
  Icon24LocationOutline // Иконка для города
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasters } from '../helpers/api';
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
  onGoToServices?: (masterName?: string) => void;
  onReview?: (booking: Booking) => void;
  onOpenMasterReviews?: (masterId: number) => void;
  onOpenPortfolio?: (masterId: number, masterName: string) => void;
};

const tabs: { id: MainTab; text: string; Icon: React.ComponentType<any> }[] = [
  { id: 'bookings', text: 'Записи', Icon: Icon28CalendarOutline },
  { id: 'masters', text: 'Мастера', Icon: Icon28UserStarBadgeOutline },
  { id: 'settings', text: 'Настройки', Icon: Icon28SettingsOutline },
];

// --- ДОСТУПНЫЕ ГОРОДА И КАТЕГОРИИ (Пока хардкод, позже можно тянуть с сервера) ---
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

  // --- СТЕЙТЫ ФИЛЬТРОВ ---
  const [search, setSearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Ургенч');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // --- ЗАГРУЗКА МАСТЕРОВ С ФИЛЬТРАМИ ---
  // Мы используем debounce для поиска, чтобы не спамить сервер при каждом нажатии клавиши
  useEffect(() => {
    if (currentTab === 'masters') {
      if (debounceTimeout) clearTimeout(debounceTimeout);

      const timeout = setTimeout(() => {
        setLoading(true);
        fetchMasters({
            search: search.trim() !== '' ? search.trim() : undefined,
            city: selectedCity,
            specialization: selectedCategory !== 'Все' ? selectedCategory : undefined,
            ordering: 'rating' // По умолчанию сортируем по рейтингу
        })
          .then(setMasters)
          .catch(console.error)
          .finally(() => setLoading(false));
      }, 500); // Ждем 500мс после последнего изменения

      setDebounceTimeout(timeout);
    }

    // Cleanup timeout on unmount
    return () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, search, selectedCity, selectedCategory]);

  const handleMasterBook = (master: MasterPublicProfile) => {
    if (onGoToServices) {
      onGoToServices(master.name);
    }
  };

  const hasQuery = Boolean(search.trim()) || selectedCategory !== 'Все';
  const isEmptyResult = masters.length === 0;

  const renderMastersContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* --- ШАПКА ФИЛЬТРОВ (Не скроллится) --- */}
        <div style={{ padding: '10px 16px 0', flexShrink: 0, background: 'var(--tgui--bg_color)' }}>

          {/* Выбор города */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <Icon24LocationOutline style={{ color: 'var(--tgui--hint_color)', marginRight: 8 }} />
            <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: 'var(--tgui--text_color)',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer'
                }}
            >
                {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                ))}
            </select>
            <Icon28ChevronRightOutline style={{ color: 'var(--tgui--hint_color)', transform: 'rotate(90deg)', width: 16, height: 16, marginLeft: 4 }} />
          </div>

          {/* Строка поиска */}
          <Input
            placeholder="Имя, специальность..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            before={<Icon24Search style={{ color: 'var(--tgui--hint_color)' }} />}
            clearable
          />

          {/* Карусель категорий */}
          <div style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 8,
              padding: '12px 0 8px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Скрываем скроллбар в Firefox
              msOverflowStyle: 'none',  // Скрываем скроллбар в IE
          }}>
              <style dangerouslySetInnerHTML={{__html: `
                div::-webkit-scrollbar { display: none; }
              `}} />

              {CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                      <div
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                              padding: '6px 14px',
                              borderRadius: 16,
                              background: isSelected ? 'var(--tgui--button_color)' : 'var(--tgui--secondary_bg_color)',
                              color: isSelected ? 'var(--tgui--button_text_color)' : 'var(--tgui--text_color)',
                              fontSize: 14,
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                          }}
                      >
                          {cat}
                      </div>
                  );
              })}
          </div>
        </div>

        {/* --- ОБЛАСТЬ СПИСКА МАСТЕРОВ (Скроллится) --- */}
        <div style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 40
        }}>
            <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>
                {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spinner size="m" />
                </div>
                )}

                {!loading && isEmptyResult && (
                <Placeholder
                    header="Ничего не найдено"
                    description={`В городе ${selectedCity} по вашему запросу нет мастеров.`}
                >
                    <LottieIcon src="/stickers/duck_out.json" size={140} />
                </Placeholder>
                )}

                {!loading && masters.length > 0 && (
                <>
                    {masters.map((m) => (
                    <Section key={m.id}>
                        {/* Кликабельная карточка мастера */}
                        <Cell
                        onClick={() => {
                            if (onOpenMasterReviews) onOpenMasterReviews(m.id);
                        }}
                        after={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {m.rating > 0 && (
                                    <div style={{
                                    background: 'orange',
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#fff',
                                    display: 'flex',
                                    gap: 4
                                    }}>
                                    ★ {m.rating.toFixed(1)}
                                    </div>
                                )}
                                <Icon28ChevronRightOutline style={{ color: 'var(--tgui--hint_color)' }} />
                            </div>
                        }
                        before={<Avatar size={48} src={m.avatar_url} fallbackIcon={<Icon28UserStarBadgeOutline />} />}
                        description={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ opacity: 0.7, fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {m.bio || 'Мастер'}
                                </span>
                                {m.address && (
                                    <span style={{ fontSize: 11, color: 'var(--tgui--hint_color)' }}>
                                    📍 {m.address}
                                    </span>
                                )}
                                {m.reviews_count > 0 && (
                                    <span style={{ fontSize: 11, color: 'var(--tgui--link_color)' }}>
                                    Смотреть отзывы ({m.reviews_count})
                                    </span>
                                )}
                            </div>
                        }
                        multiline
                        >
                        {m.name}
                        </Cell>

                        {/* Блок кнопок */}
                        <Cell>
                            <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 2 }}>
                                <Button
                                mode="bezeled"
                                size="m"
                                style={{ flex: 1 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenPortfolio) onOpenPortfolio(m.id, m.name);
                                }}
                                >
                                Портфолио
                                </Button>

                                <Button
                                mode="filled"
                                size="m"
                                style={{ flex: 1 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMasterBook(m);
                                }}
                                >
                                Записаться
                                </Button>
                            </div>
                        </Cell>
                    </Section>
                    ))}
                </>
                )}
            </List>
        </div>
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
           onReview={onReview}
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
        <SettingsScreen
          telegramId={telegramId}
          onBack={onBack}
          onLogout={() => {
              if (onLogout) onLogout();
              }}
        />
      );
    }

    return null;
  };

  return (
    <div style={{
       display: 'flex',
       flexDirection: 'column',
       height: '100vh',
       overflow: 'hidden'
    }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderContent()}
      </div>
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

export default ProfileScreen;