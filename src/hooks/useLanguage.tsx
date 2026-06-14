import React, { createContext, useContext, useState } from 'react';
import { TRANSLATIONS } from '../data/translations';

export type Language = 'en' | 'pt-BR';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('wc2026_lang');
    if (saved === 'en' || saved === 'pt-BR') {
      return saved;
    }
    // Default to pt-BR if browser language is Portuguese
    if (navigator.language.startsWith('pt')) {
      return 'pt-BR';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wc2026_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] as Record<string, string>;
    const fallback = TRANSLATIONS['en'] as Record<string, string>;
    let text = dict[key] || fallback[key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// This module mixes a component (LanguageProvider), a hook (useLanguage), and a
// shared type (Language) by design — fast-refresh scoping doesn't apply to a
// context module, so the react-refresh rule is intentionally disabled here.
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
