// src/App.tsx
import React from 'react';
import {
  AppRoot,
  Placeholder,
} from '@telegram-apps/telegram-ui';

const App: React.FC = () => (
  <AppRoot>
    <Placeholder
      header="Connected Booking"
      description="Мини‑апп запущено через Telegram UI Kit"
    >
      <img
        alt="Telegram sticker"
        src="https://xelene.me/telegram.gif"
        style={{ display: 'block', width: '144px', height: '144px' }}
      />
    </Placeholder>
  </AppRoot>
);

export default App;