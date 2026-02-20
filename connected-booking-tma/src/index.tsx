import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import eruda from 'eruda'; // <-- ДОБАВЛЯЕМ ИМПОРТ

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

// <-- ВБРАСЫВАЕМ ИНИЦИАЛИЗАЦИЮ ПРЯМО СЮДА
eruda.init();

console.log('### index.tsx loaded');

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