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
import SettingsScreen from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search,
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasters } from '../helpers/api'; // Импортируем API
import type { MasterPublicProfile } from '../helpers/api';

// Lottie component
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
  onGoToServices?: (masterName?: string) => void;
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
  onGoToServices,
}) => {
  const [currentTab, setCurrentTab] = useState<MainTab>(initialTab);

  // State для мастеров
  const [masters, setMasters] = useState<MasterPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>('');

  // Загрузка мастеров при монтировании
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
      // Передаем имя мастера для фильтрации услуг на следующем экране
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
      <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>

        {/* Поиск */}
        <div style={{ padding: '10px 16px 6px' }}>
          <Input
            header="Поиск мастера"
            placeholder="Имя, описание..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            before={<Icon24Search style={{ color: 'var(--tgui--hint_color)' }} />}
            clearable
          />
        </div>

        {/* Загрузка */}
        {loading && (
           <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
             <Spinner size="m" />
           </div>
        )}

        {/* Пустое состояние поиска */}
        {!loading && isEmptyResult && (
          <Placeholder
            header="Ничего не найдено"
            description="Попробуйте изменить запрос"
          >
             <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        )}

        {/* Пустое состояние, если мастеров вообще нет */}
        {!loading && !hasQuery && masters.length === 0 && (
           <Placeholder header="Нет мастеров" description="Список пока пуст." />
        )}

        {/* Список мастеров */}
        {!loading && filteredMasters.length > 0 && (
           <>
             {filteredMasters.map((m) => (
               <Section key={m.id}>
                 <Cell
                   before={<Avatar size={48} src={m.avatar_url} fallbackIcon={<Icon28UserStarBadgeOutline />} />}
                   description={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Используем Bio как описание специальности, если есть */}
                        <span style={{ opacity: 0.7, fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                           {m.bio || 'Мастер'}
                        </span>
                      </div>
                   }
                   after={
                      m.rating > 0 && (
                        <div style={{
                           background: 'var(--tgui--section_bg_color)',
                           padding: '4px 8px',
                           borderRadius: 6,
                           fontSize: 12,
                           fontWeight: 600,
                           color: 'orange'
                        }}>
                          ★ {m.rating.toFixed(1)}
                        </div>
                      )
                   }
                   multiline
                 >
                   {m.name}
                 </Cell>

                 <Cell>
                    <Button
                      mode="filled"
                      size="m"
                      stretched
                      onClick={() => handleMasterBook(m)}
                    >
                      Записаться
                    </Button>
                 </Cell>
               </Section>
             ))}
           </>
        )}
      </List>
    );
  };

  const renderContent = () => {
    if (currentTab === 'bookings') {
      return (
        <MyBookingsScreen telegramId={telegramId} onBack={onBack} onGoToServices={onGoToServices} />
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
          onLogout={() => console.log('logout')}
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