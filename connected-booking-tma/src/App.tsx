// src/App.tsx
import React from 'react';
import {
  AppRoot,
  Placeholder,
  Button,
} from '@telegram-apps/telegram-ui';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';

const App: React.FC = () => {
  const webApp = useTelegramWebApp();
  const themeParams = webApp?.themeParams;

  const handleContinueClick = () => {
    const message = 'Отлично! Дальше сделаем выбор услуг 😊';

    if (webApp && webApp.showAlert) {
      webApp.showAlert(message);
    } else {
      // fallback, если Telegram WebApp API нет
      alert(message);
    }
  };

  return (
    <AppRoot appearance={themeParams?.bg_color ? 'dark' : 'light'}>
      <div style={{ padding: 16, height: '100%', boxSizing: 'border-box' }}>
        <Placeholder
          header="Connected Booking"
          description="Добро пожаловать! Здесь позже появится запись к мастерам и список услуг."
        >
          <img
            alt="Telegram sticker"
            src="https://xelene.me/telegram.gif"
            style={{
              display: 'block',
              width: 144,
              height: 144,
              marginBottom: 16,
            }}
          />

          <Button size="l" mode="primary" onClick={handleContinueClick}>
            Продолжить
          </Button>
        </Placeholder>
      </div>
    </AppRoot>
  );
};

export default App;