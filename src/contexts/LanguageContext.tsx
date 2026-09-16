'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Translations } from '@/types/i18n';

interface LanguageContextType {
  language: 'en';
  translations: Translations;
  dir: 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

async function loadTranslations(): Promise<Translations> {
  try {
    const translationsModule = await import(`@/locales/en.json`);
    return translationsModule.default;
  } catch (error) {
    console.error("Failed to load English translations:", error);
    return {};
  }
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTranslations() {
      const loadedTranslations = await loadTranslations();
      setTranslations(loadedTranslations);
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      setIsLoading(false);
    }
    fetchTranslations();
  }, []);

  const value = useMemo<LanguageContextType>(() => ({
    language: 'en',
    translations,
    dir: 'ltr',
  }), [translations]);

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Helper hook to get a specific translation string
export const useTranslation = () => {
  const { translations, language } = useLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let current: any = translations;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          console.warn(`Translation key "${key}" not found for language "${language}".`);
          return key; // Return key if not found
        }
      }
      if (typeof current === 'string' && params) {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          const placeholderRegExp = new RegExp(`\\{${paramKey}\\}`, 'g');
          return str.replace(placeholderRegExp, String(paramValue));
        }, current);
      }
      return typeof current === 'string' ? current : key;
    },
    [translations, language]
  );

  return t;
};