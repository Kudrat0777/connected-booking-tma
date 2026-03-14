import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { translations, LangCode } from './translations';

// Функция для определения языка по умолчанию
const getDefaultLang = (): LangCode => {
  // 1. Проверяем, выбирал ли юзер язык раньше
  const savedLang = localStorage.getItem('app_lang') as LangCode;
  if (savedLang && ['ru', 'uz', 'en'].includes(savedLang)) {
    return savedLang;
  }

  // 2. Если не выбирал, смотрим язык его Telegram
  const tg = (window as any).Telegram?.WebApp;
  const tgLang = tg?.initDataUnsafe?.user?.language_code;

  if (tgLang === 'ru') return 'ru';
  if (tgLang === 'uz') return 'uz';

  // 3. Если язык Telegram другой (например, немецкий) или не определен — ставим английский
  return 'en';
};

type LanguageContextType = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(getDefaultLang());

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang); // Запоминаем выбор пользователя
  };

  // Функция перевода
  const t = (key: string): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Хук для удобного использования в компонентах
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};