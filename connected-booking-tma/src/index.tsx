import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { LanguageProvider } from './helpers/LanguageContext';

console.log('### index.tsx loaded');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element #root not found in index.html');
} else {
  const manifestUrl = new URL('tonconnect-manifest.json', window.location.href).toString();

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <LanguageProvider>
           <App />
        </LanguageProvider>
      </TonConnectUIProvider>
    </React.StrictMode>,
  );
}