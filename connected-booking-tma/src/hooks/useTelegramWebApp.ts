import { useEffect, useState } from 'react';

type TelegramWebApp = typeof window.Telegram.WebApp | null;

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp>(null);

  useEffect(() => {
    // просто чтобы точно увидеть, что есть в window
    // eslint-disable-next-line no-console
    console.log('window.Telegram:', window.Telegram);

    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('Telegram WebApp object is not available');
      return;
    }

    const wa = window.Telegram.WebApp;
    setWebApp(wa);

    try {
      wa.ready();
    } catch (e) {
      console.warn('Error calling WebApp.ready()', e);
    }
  }, []);

  return webApp;
}