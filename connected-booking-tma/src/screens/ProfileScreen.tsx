import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tabbar,
  Placeholder,
  Spinner,
  Card,
  Title
} from '@telegram-apps/telegram-ui';

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
  // Используем onOpenMasterProfile для перехода в визитку мастера
  onOpenMasterProfile?: (masterId: number, masterName: string) => void;
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
  onOpenMasterProfile,
  onReview,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);
  const [masters, setMasters] = useState<MasterPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Ургенч');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Прячем нативные кнопки на главном экране
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    tg.BackButton.hide();
    if (tg.MainButton) tg.MainButton.hide();
  }, [currentTab]);

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

  const triggerHaptic = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  const renderMastersContent = () => (
    <div style={{
      backgroundColor: 'var(--tg-theme-bg-color)',
      minHeight: '100%',
      paddingBottom: 100
    }}>

      {/* ШАПКА: ПОИСК СВЕРХУ, ГОРОД СПРАВА СНИЗУ */}
      <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--tg-theme-bg-color)',
          padding: '16px 16px 8px'
      }}>

        {/* Кастомный поиск в стиле Telegram */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px'
        }}>
            <Icon24Search style={{ color: 'var(--tg-theme-hint-color)', marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Поиск мастера или услуги..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: 'var(--tg-theme-text-color)',
                  width: '100%',
                  fontSize: '16px'
              }}
            />
        </div>

        {/* Выбор города (Прижат вправо) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--tg-theme-link-color)',
              fontSize: '15px',
              fontWeight: 500
          }}>
             <Icon24LocationOutline width={18} height={18} />
             <span>{selectedCity}</span>
             <Icon28ChevronRightOutline width={16} height={16} style={{ transform: 'rotate(90deg)', marginTop: '2px' }} />

             {/* Невидимый нативный селект поверх текста */}
             <select
                value={selectedCity}
                onChange={(e) => { triggerHaptic(); setSelectedCity(e.target.value); }}
                style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0,
                    appearance: 'none'
                }}
             >
                {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* КОНТЕНТ (СПИСОК МАСТЕРОВ) */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}><Spinner size="l" /></div>
        ) : masters.length === 0 ? (
          <div style={{ marginTop: 20 }}>
            <Placeholder
              header="Никого не нашли"
              description="Попробуйте изменить город или поисковой запрос"
            >
              <LottieIcon src="/stickers/duck_out.json" size={140} />
            </Placeholder>
          </div>
        ) : (
          <div>
             {Object.entries(groupedMasters).map(([categoryName, catMasters]) => (
                <div key={categoryName} style={{ marginBottom: 28 }}>
                   <Title level="2" weight="2" style={{ marginBottom: 12, fontSize: 20 }}>
                     {categoryName}
                   </Title>

                   <div style={{
                       display: 'flex',
                       overflowX: 'auto',
                       gap: 12,
                       paddingBottom: 8,
                       scrollbarWidth: 'none',
                       msOverflowStyle: 'none'
                    }}>
                      {catMasters.map(m => (
                         <Card
                           key={m.id}
                           onClick={() => {
                             triggerHaptic();
                             onOpenMasterProfile?.(m.id, m.name);
                           }}
                           style={{
                             width: 140,
                             flexShrink: 0,
                             cursor: 'pointer',
                             border: 'none',
                             backgroundColor: 'var(--tg-theme-secondary-bg-color)'
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
                                  width: '100%',
                                  borderTopLeftRadius: 'inherit',
                                  borderTopRightRadius: 'inherit'
                                }}
                              />

                              <Card.Cell readOnly subtitle={m.bio || 'Специалист'}>
                                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--tg-theme-text-color)' }}>
                                  {m.name}
                                </span>
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
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--tg-theme-bg-color)' }}>
      <main style={{ height: '100%', overflowY: 'auto' }}>
        {currentTab === 'bookings' && <MyBookingsScreen telegramId={telegramId} onReview={onReview} onBack={onBack} onGoToServices={() => setCurrentTab('masters')} />}
        {currentTab === 'masters' && renderMastersContent()}
        {currentTab === 'settings' && <SettingsScreen telegramId={telegramId} onBack={onBack} onLogout={onLogout} />}
      </main>

      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        {tabs.map(({ id, text, Icon }) => (
          <Tabbar.Item
            key={id}
            text={text}
            selected={id === currentTab}
            onClick={() => {
              if (id !== currentTab) triggerHaptic();
              setCurrentTab(id);
            }}
          >
            <Icon />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </div>
  );
};

export default ProfileScreen;