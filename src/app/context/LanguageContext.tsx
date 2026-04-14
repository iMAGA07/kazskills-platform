import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Language, createTranslator } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('kazskills_lang') as Language) || 'ru';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('kazskills_lang', newLang);
  }, []);

  const translator = useMemo(() => createTranslator(lang), [lang]);
  const t = useCallback((key: string, fallback?: string) => translator(key, fallback), [translator]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}