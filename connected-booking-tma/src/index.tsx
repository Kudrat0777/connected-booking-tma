import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

// ИМПОРТ TON CONNECT
import { TonConnectUIProvider } from '@tonconnect/ui-react';

console.log('### index.tsx loaded');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element #root not found in index.html');
} else {
  // Манифест - это JSON файл, который описывает ваше приложение для кошельков
  // Пока используем тестовый публичный манифест от сообщества TON
  // Получаем текущий базовый URL приложения (например, ваш Zrok туннель или реальный домен)
const manifestUrl = new URL('tonconnect-manifest.json', window.location.href).toString();

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* ОБОРАЧИВАЕМ ПРИЛОЖЕНИЕ В ПРОВАЙДЕР */}
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </React.StrictMode>,
  );
}