// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

// (опционально) Telegram Analytics — включишь, когда будет токен
// import telegramAnalytics from '@telegram-apps/analytics';
//
// telegramAnalytics.init({
//   token: 'YOUR_TOKEN',          // токен из @DataChief_bot / TON Builders
//   appName: 'CONNECTED_BOOKING', // идентификатор приложения
// });

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element #root not found in index.html');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}