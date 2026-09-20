'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguageCode, getLanguageConfig, LanguageDefinition } from '@/config/languages';

interface LanguageContextType {
  currentLanguage: SupportedLanguageCode;
  setLanguage: (lang: SupportedLanguageCode) => void;
  languageConfig: LanguageDefinition;
  isChinese: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<SupportedLanguageCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem('learnvocab_current_lang') as SupportedLanguageCode;
    if (saved && (saved === 'en' || saved === 'zh')) {
      setCurrentLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguageCode) => {
    setCurrentLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('learnvocab_current_lang', lang);
    }
  };

  const languageConfig = getLanguageConfig(currentLanguage);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        languageConfig,
        isChinese: currentLanguage === 'zh',
        isEnglish: currentLanguage === 'en',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
