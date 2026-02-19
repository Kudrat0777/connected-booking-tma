// src/hooks/useTelegramWebApp.ts
import { useEffect, useState } from 'react';

type TelegramWebApp = typeof window.Telegram.WebApp | null;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp>(null);

  useEffect(() => {
    if (!window.Telegram || !window.Telegram.WebApp) {
      return;
    }

    const wa = window.Telegram.WebApp;
    setWebApp(wa);

    try {
      wa.ready();
    } catch (e) {
      // ignore
    }
  }, []);

  return webApp;
}