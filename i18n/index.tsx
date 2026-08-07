import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations, TranslationDict } from './translations';

export type Language = 'ja' | 'en';

const STORAGE_KEY = 'language';

export const getStoredLanguage = (): Language =>
  localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ja';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDict;
}

// Defaults to Japanese so components using useI18n() render sensibly in
// isolation (e.g. component tests) even without an <I18nProvider> ancestor.
const defaultValue: I18nContextValue = { language: 'ja', setLanguage: () => {}, t: translations.ja };
const I18nContext = createContext<I18nContextValue>(defaultValue);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const value = useMemo(() => ({ language, setLanguage, t: translations[language] }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => useContext(I18nContext);
