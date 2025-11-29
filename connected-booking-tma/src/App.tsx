// src/App.tsx
import React, { useMemo, useState } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import type { Service, Slot, Booking } from './helpers/api';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import {
  resolveTelegramUser,
  type TelegramUser,
} from './helpers/telegramUser';

type Screen = 'welcome' | 'services' | 'slots' | 'bookingConfirm' | 'bookingDone';

const App: React.FC = () => {
  const webApp = useTelegramWebApp();

  const user: TelegramUser | null = useMemo(() => {
    // webApp нужен лишь для того, чтобы Telegram.WebApp уже был инициализирован.
    // Реальное извлечение user делаем так же, как в старом фронте.
    const u = resolveTelegramUser();
    // можно раскомментировать для проверки:
    // console.log('Resolved Telegram user:', u);
    return u;
  }, [webApp]);

  const [screen, setScreen] = useState<Screen>('welcome');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const handleServiceSelected = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null);
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
    setScreen('welcome');
  };

  return (
    <AppRoot>
      {screen === 'welcome' && (
        <WelcomeScreen onContinue={() => setScreen('services')} />
      )}

      {screen === 'services' && (
        <ServicesScreen
          onBack={() => setScreen('welcome')}
          onServiceSelected={handleServiceSelected}
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
        <div style={{ padding: 20 }}>
          <h2>Бронь создана!</h2>
          <p>
            Мастер: {createdBooking.master_name || selectedService?.master_name}
          </p>
          <p>
            Услуга: {createdBooking.service_name || selectedService?.name}
          </p>
          <p>
            Время:{' '}
            {new Date(createdBooking.slot.time).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          <button
            onClick={resetToStart}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            На главный экран
          </button>
        </div>
      )}
    </AppRoot>
  );
};

export default App;