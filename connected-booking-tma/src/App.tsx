// src/App.tsx
import React, { useState } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import type { Service, Slot } from './helpers/api';

type Screen = 'welcome' | 'services' | 'slots';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const handleServiceSelected = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setScreen('slots');
  };

  const handleSlotSelected = (slot: Slot) => {
    setSelectedSlot(slot);
    console.log('Выбран слот:', slot);
    // дальше сделаем переход на экран подтверждения брони
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
    </AppRoot>
  );
};

export default App;