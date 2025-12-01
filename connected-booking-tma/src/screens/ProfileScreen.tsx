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
  Text
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { MyBookingsScreen } from './MyBookingsScreen';
import SettingsScreen from './SettingsScreen';
import {
  Icon28CalendarOutline,
  Icon28UserStarBadgeOutline,
  Icon28SettingsOutline,
  Icon24Search, // Добавили иконку поиска
} from '@vkontakte/icons';
import lottie from 'lottie-web';

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

const tabs: { id: MainTab; text: string; Icon: React.ComponentType<any> }[] = [
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

  const filteredMasters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => {
      const inName = m.name.toLowerCase().includes(q);
      const inSpec = m.specialty.toLowerCase().includes(q);
      const inDesc = m.description ? m.description.toLowerCase().includes(q) : false;
      return inName || inSpec || inDesc;
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
            placeholder="Имя, услуга..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            before={<Icon24Search style={{ color: 'var(--tgui--hint_color)' }} />}
            clearable // Добавляет крестик очистки
          />
        </div>

        {/* Пустое состояние поиска */}
        {isEmptyResult && (
          <Placeholder
            header="Ничего не найдено"
            description="Попробуйте изменить запрос"
          >
             <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        )}

        {/* Список мастеров */}
        {(!hasQuery || filteredMasters.length > 0) && (
           <>
             {filteredMasters.map((m) => (
               <Section key={m.id}>
                 <Cell
                   // Аватар мастера
                   before={<Avatar size={48} src={m.avatarUrl} fallbackIcon={<Icon28UserStarBadgeOutline />} />}
                   // Описание (специальность + рейтинг)
                   description={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{m.specialty}</span>
                        {m.description && <span style={{ opacity: 0.7, fontSize: 12 }}>{m.description}</span>}
                      </div>
                   }
                   after={
                      m.rating && (
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

      {/* Основной контент (скроллится внутри своих экранов) */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderContent()}
      </div>

      {/* Нижняя панель навигации */}
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