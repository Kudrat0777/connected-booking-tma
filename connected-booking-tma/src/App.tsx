// src/App.tsx
import React, { useState } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';

type Screen = 'welcome' | 'services';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('welcome');

  return (
    <AppRoot>
      {screen === 'welcome' && (
        <WelcomeScreen onContinue={() => setScreen('services')} />
      )}

      {screen === 'services' && (
        <ServicesScreen onBack={() => setScreen('welcome')} />
      )}
    </AppRoot>
  );
};

export default App;