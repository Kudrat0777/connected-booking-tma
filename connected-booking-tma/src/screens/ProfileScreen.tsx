import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tabbar,
  Placeholder,
  Spinner,
  Card,
  List,
  Section,
  Select,
  Input,
  Title
} from '@telegram-apps/telegram-ui';

// Оставляем только нужные стили (позже мы их тоже минимизируем)
import '../css/ProfileScreen.css';

import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasters, getFullImageUrl } from '../helpers/api';
import type { MasterPublicProfile, Booking } from '../helpers/api';

const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: src,
    });
    return () => anim.destroy();
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type MainTab = 'bookings' | 'masters' | 'settings';

type Props = {
  telegramId: number;
  initialTab?: MainTab;
  onBack: () => void;
  onLogout?: () => void;
  onOpenMasterProfile?: (masterId: number, masterName: string) => void;
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

  // Управляем нативными кнопками
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // На главном экране с таббаром кнопка "Назад" не нужна
    tg.BackButton.hide();
    // И MainButton тут тоже не нужна
    if (tg.MainButton) tg.MainButton.hide();

    // Если есть необходимость включить свайп вниз для закрытия (на iOS),
    // но в TMA лучше расширить на весь экран:
    tg.expand();
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

  // Группируем мастеров по специализации
  const groupedMasters = useMemo(() => {
    const groups: Record<string, MasterPublicProfile[]> = {};
    masters.forEach(m => {
        const cat = (m as any).specialization || 'Рекомендации';
        if (!groups[cat]) {
            groups[cat] = [];
        }
        groups[cat].push(m);
    });
    return groups;
  }, [masters]);

  // --- ИДЕАЛЬНЫЙ UI ДЛЯ ВКЛАДКИ МАСТЕРОВ ---
  const renderMastersContent = () => (
    <div style={{ paddingBottom: '80px', backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh' }}>

      {/* Шапка с фильтрами - используем List и Section из TGUI для нативного вида */}
      <List style={{ marginBottom: 16 }}>
        <Section>
          <Select
            header="Ваш город"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </Select>
          <Input
            header="Поиск"
            placeholder="Кого ищем?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            before={<Icon24Search style={{ color: 'var(--tg-theme-hint-color)' }} />}
          />
        </Section>
      </List>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spinner size="l" /></div>
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
                <div key={categoryName} style={{ marginBottom: 24 }}>
                   <Title level="2" weight="2" style={{ marginBottom: 12, fontSize: 20 }}>
                     {categoryName}
                   </Title>

                   {/* Горизонтальный скролл с карточками мастеров */}
                   <div style={{
                       display: 'flex',
                       overflowX: 'auto',
                       gap: 12,
                       paddingBottom: 8,
                       msOverflowStyle: 'none',
                       scrollbarWidth: 'none'
                    }}>
                      {catMasters.map(m => (
                         <Card
                           key={m.id}
                           onClick={() => {
                             const tg = (window as any).Telegram?.WebApp;
                             if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                             onOpenMasterProfile?.(m.id, m.name);
                           }}
                           style={{ width: 140, flexShrink: 0, cursor: 'pointer' }}
                         >
                            <React.Fragment>
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
                              <Card.Cell readOnly subtitle={m.bio || 'Специалист'}>
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
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
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
                const tg = (window as any).Telegram?.WebApp;
                if (tg?.HapticFeedback && id !== currentTab) {
                    tg.HapticFeedback.selectionChanged();
                }
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