// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

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