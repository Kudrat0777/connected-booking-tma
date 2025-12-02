import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Master Screens
import { MasterWelcomeScreen } from './screens/MasterWelcomeScreen';
import { MasterRegistrationScreen } from './screens/MasterRegistrationScreen';
import { MasterDashboardScreen } from './screens/MasterDashboardScreen';
import { MasterScheduleScreen } from './screens/MasterScheduleScreen'; // <--- ВАЖНО: ИМПОРТ

import type { Service, Slot, Booking } from './helpers/api';
import { getUserFromQuery } from './helpers/telegramQueryUser';

type Screen =
  // Client
  | 'welcome'
  | 'services'
  | 'slots'
  | 'bookingConfirm'
  | 'bookingDone'
  | 'profile'
  | 'settings'
  // Master
  | 'master_welcome'
  | 'master_registration'
  | 'master_dashboard'
  | 'master_schedule'; // <--- ВАЖНО: НОВЫЙ ТИП

type MainTab = 'bookings' | 'masters' | 'settings';

const App: React.FC = () => {
  const tg = (window as any).Telegram?.WebApp;
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!tg) return;

    const bindThemeParams = () => {
      const params = tg.themeParams;
      const root = document.documentElement;

      const isDark = tg.colorScheme === 'dark';
      setAppearance(isDark ? 'dark' : 'light');

      if (params.bg_color) {
        document.body.style.backgroundColor = params.bg_color;
        root.style.setProperty('background-color', params.bg_color);
      }

      if (params.bg_color) {
        root.style.setProperty('--tgui--bg_color', params.bg_color);
        root.style.setProperty('--tgui--secondary_bg_color', params.secondary_bg_color || params.bg_color);
      }
      if (params.text_color) {
        root.style.setProperty('--tgui--text_color', params.text_color);
        root.style.setProperty('--tgui--subtitle_text_color', params.hint_color || '#888');
      }
      if (params.hint_color) {
        root.style.setProperty('--tgui--hint_color', params.hint_color);
      }
      if (params.button_color) {
        root.style.setProperty('--tgui--button_color', params.button_color);
        root.style.setProperty('--tgui--button_text_color', params.button_text_color || '#fff');
      }
      if (params.link_color) {
        root.style.setProperty('--tgui--link_color', params.link_color);
      }

      tg.setHeaderColor(params.bg_color);
      tg.setBackgroundColor(params.bg_color);
    };

    tg.ready();
    tg.expand();
    bindThemeParams();

    tg.onEvent('themeChanged', bindThemeParams);
    return () => tg.offEvent('themeChanged', bindThemeParams);
  }, [tg]);

  const user = useMemo(() => {
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
    return getUserFromQuery();
  }, [tg]);

  const [screen, setScreen] = useState<Screen>('welcome');
  const [mainTab, setMainTab] = useState<MainTab>('bookings');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [selectedMasterName, setSelectedMasterName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'master') {
      setScreen('master_welcome');
    }
  }, []);

  const handleServiceSelected = (service: Service) => {
    setSelectedService(service);
    setScreen('slots');
  };

  const handleSlotSelected = (slot: Slot) => {
    setSelectedSlot(slot);
    setScreen('bookingConfirm');
  };

  const handleBookingSuccess = (booking: Booking) => {
    setCreatedBooking(booking);
    setScreen('bookingDone');
  };

  const resetToStart = () => {
    setSelectedService(null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setSelectedMasterName(null);
    setScreen('welcome');
  };

  const platform = tg?.platform || 'base';
  const isIos = ['macos', 'ios'].includes(platform);

  return (
    <AppRoot
      appearance={appearance}
      platform={isIos ? 'ios' : 'base'}
    >
      {/* --- CLIENT SCREENS --- */}

      {screen === 'welcome' && (
        <WelcomeScreen
          onContinue={() => {
            setSelectedMasterName(null);
            setScreen('services');
          }}
          onOpenMyBookings={() => {
            setMainTab('bookings');
            setScreen('profile');
          }}
        />
      )}

      {screen === 'services' && (
        <ServicesScreen
          onBack={() => setScreen('welcome')}
          onServiceSelected={handleServiceSelected}
          selectedMasterName={selectedMasterName}
        />
      )}

      {screen === 'slots' && selectedService && (
        <SlotsScreen
          service={selectedService}
          onBack={() => setScreen('services')}
          onSlotSelected={handleSlotSelected}
        />
      )}

      {screen === 'bookingConfirm' && selectedService && selectedSlot && (
        <BookingConfirmScreen
          service={selectedService}
          slot={selectedSlot}
          onBack={() => setScreen('slots')}
          onSuccess={handleBookingSuccess}
          user={user}
        />
      )}

      {screen === 'bookingDone' && createdBooking && (
        <div style={{ padding: 20, minHeight: '100vh', background: 'var(--tgui--bg_color)' }}>
          <h2 style={{ color: 'var(--tgui--text_color)' }}>Бронь создана!</h2>
          <p style={{ color: 'var(--tgui--text_color)' }}>
            Мастер: {createdBooking.master_name || selectedService?.master_name}
          </p>
          <p style={{ color: 'var(--tgui--text_color)' }}>
            Услуга: {createdBooking.service_name || selectedService?.name}
          </p>
          <p style={{ color: 'var(--tgui--text_color)' }}>
            Время: {new Date(createdBooking.slot.time).toLocaleString('ru-RU')}
          </p>
          <button
            onClick={resetToStart}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--tgui--button_color)',
              color: 'var(--tgui--button_text_color)',
              cursor: 'pointer',
            }}
          >
            На главный экран
          </button>
        </div>
      )}

      {screen === 'profile' && user && (
        <ProfileScreen
          telegramId={user.id}
          initialTab={mainTab}
          onBack={() => setScreen('welcome')}
          onGoToServices={(masterName) => {
            setSelectedMasterName(masterName || null);
            setScreen('services');
          }}
        />
      )}

      {screen === 'settings' && user && (
        <SettingsScreen
          telegramId={user.id}
          onBack={() => setScreen('profile')}
        />
      )}

      {/* --- MASTER SCREENS --- */}

      {screen === 'master_welcome' && (
        <MasterWelcomeScreen
          onStart={() => setScreen('master_registration')}
          onLogin={() => setScreen('master_dashboard')}
        />
      )}

      {screen === 'master_registration' && user && (
        <MasterRegistrationScreen
          telegramId={user.id}
          initialName={[user.first_name, user.last_name].filter(Boolean).join(' ')}
          onBack={() => setScreen('master_welcome')}
          onComplete={() => setScreen('master_dashboard')}
        />
      )}

      {screen === 'master_dashboard' && user && (
        <MasterDashboardScreen
          telegramId={user.id}
          onSwitchToClient={() => setScreen('welcome')}
          onOpenSchedule={() => setScreen('master_schedule')} // <--- ВАЖНО: ПЕРЕДАЕМ ФУНКЦИЮ
        />
      )}

      {screen === 'master_schedule' && user && ( // <--- ВАЖНО: РЕНДЕР ЭКРАНА
        <MasterScheduleScreen
           telegramId={user.id}
           onBack={() => setScreen('master_dashboard')}
        />
      )}

    </AppRoot>
  );
};

export default App;