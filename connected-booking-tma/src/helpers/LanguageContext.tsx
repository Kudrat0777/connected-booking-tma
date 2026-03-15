import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { translations, LangCode } from './translations';

type LanguageContextType = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Изначально ставим английский, но сразу же в useEffect определим правильный
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    // 1. Проверяем, менял ли пользователь язык ВРУЧНУЮ внутри нашего приложения
    const manualLang = localStorage.getItem('app_manual_lang') as LangCode;

    if (manualLang && ['ru', 'uz', 'en'].includes(manualLang)) {
        // Если менял вручную - строго используем его
        setLangState(manualLang);
    } else {
        // 2. Если вручную не менял - читаем СВЕЖИЙ язык из Telegram
        const tg = (window as any).Telegram?.WebApp;
        const tgLang = tg?.initDataUnsafe?.user?.language_code;

        if (tgLang === 'ru') setLangState('ru');
        else if (tgLang === 'uz') setLangState('uz');
        else setLangState('en'); // Все остальные языки (испанский, немецкий и тд) -> английский
    }
  }, []);

  // Функция для ручного переключения языка (например, из настроек)
  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    // Сохраняе�� флаг, что юзер сам выбрал язык, чтобы больше не слушать Telegram
    localStorage.setItem('app_manual_lang', newLang);
  };

  // Функция перевода
  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};