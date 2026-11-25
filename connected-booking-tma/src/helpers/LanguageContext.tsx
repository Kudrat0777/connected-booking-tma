import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations, LangCode } from './translations';

type LanguageContextType = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGS: LangCode[] = ['ru', 'uz', 'en'];

// Язык нужен уже при первой отрисовке: с ним же регистрируется новый клиент
const detectLang = (): LangCode => {
  // 1. Язык, выбранный вручную в приложении
  try {
    const manual = localStorage.getItem('app_manual_lang') as LangCode;
    if (LANGS.includes(manual)) return manual;
  } catch { /* приватный режим */ }
  // 2. Язык Telegram; остальные языки (испанский, немецкий и т. д.) — английский
  const code = String((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code || '').slice(0, 2) as LangCode;
  return LANGS.includes(code) ? code : 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(detectLang);

  // Функция для ручного переключения языка (например, из настроек)
  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    // Сохраняем флаг, что юзер сам выбрал язык, чтобы больше не слушать Telegram
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