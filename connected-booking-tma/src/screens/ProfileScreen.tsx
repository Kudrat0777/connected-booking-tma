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
  Spinner
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search,
  Icon28ChevronRightOutline
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

  useEffect(() => {
    if (currentTab === 'masters') {
      setLoading(true);
      fetchMasters()
        .then(setMasters)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentTab]);

  const handleMasterBook = (master: MasterPublicProfile) => {
    if (onGoToServices) {
      onGoToServices(master.name);
    }
  };

  const filteredMasters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => {
      const inName = m.name.toLowerCase().includes(q);
      const inBio = m.bio ? m.bio.toLowerCase().includes(q) : false;
      return inName || inBio;
    });
  }, [masters, search]);

  const hasQuery = Boolean(search.trim());
  const isEmptyResult = hasQuery && filteredMasters.length === 0;

  const renderMastersContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 1. Блок поиска (Фиксированный, не скроллится) */}
        <div style={{ padding: '10px 16px 6px', flexShrink: 0, background: 'var(--tgui--bg_color)' }}>
          <Input
            placeholder="Имя, описание..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            before={<Icon24Search style={{ color: 'var(--tgui--hint_color)' }} />}
            clearable
          />
        </div>

        {/* 2. Область списка (Скроллится) */}
        <div style={{
            height: 'calc(100vh - 180px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 40 // Доп. отступ снизу
        }}>
            <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>
                {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    <Spinner size="m" />
                </div>
                )}

                {!loading && isEmptyResult && (
                <Placeholder
                    header="Ничего не найдено"
                    description="Попробуйте изменить запрос"
                >
                    <LottieIcon src="/stickers/duck_out.json" size={140} />
                </Placeholder>
                )}

                {!loading && !hasQuery && masters.length === 0 && (
                <Placeholder header="Нет мастеров" description="Список пока пуст." />
                )}

                {!loading && filteredMasters.length > 0 && (
                <>
                    {filteredMasters.map((m) => (
                    <Section key={m.id}>
                        {/* Кликабельная карточка мастера (открывает отзывы) */}
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
                                {/* Кнопка ПОРТФОЛИО */}
                                <Button
                                mode="bezeled"
                                size="m"
                                style={{ flex: 1 }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Важно: остановить всплытие
                                    if (onOpenPortfolio) onOpenPortfolio(m.id, m.name);
                                }}
                                >
                                Портфолио
                                </Button>

                                {/* Кнопка ЗАПИСАТЬСЯ */}
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
      // MyBookingsScreen уже имеет свой скролл и логику
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