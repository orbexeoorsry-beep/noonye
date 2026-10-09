import { useState, useEffect } from 'react';
import { ar } from './ar';
import { en } from './en';
import { TranslationDictionary } from './types';

export type Language = string;

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  dir: 'rtl' | 'ltr';
}

/**
 * Registry of supported languages.
 * Adding a new language in the future only requires adding its folder/files
 * and registering it here or via `registerLanguage()`.
 */
export const supportedLanguages: Record<string, LanguageMeta> = {
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
};

const dictionaries: Record<string, TranslationDictionary> = {
  ar,
  en,
};

/**
 * Allows dynamic registration of new languages at runtime without modifying core logic.
 */
export function registerLanguage(
  code: string,
  dictionary: TranslationDictionary,
  meta: LanguageMeta
) {
  dictionaries[code] = dictionary;
  supportedLanguages[code] = meta;
}

// Arabic is the default language
let currentLanguage: Language = 'ar';

// Initialize from localStorage if present in browser
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('noon_language');
    if (saved && (saved === 'ar' || saved === 'en' || dictionaries[saved])) {
      currentLanguage = saved;
    }
  } catch {
    // ignore localStorage errors in sandboxed iframes
  }
  const isRtl = currentLanguage === 'ar' || supportedLanguages[currentLanguage]?.dir === 'rtl';
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
}

const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language) {
  if (!dictionaries[lang] && lang !== 'ar' && lang !== 'en') {
    console.warn(`Language '${lang}' is not registered, defaulting to 'ar'`);
    lang = 'ar';
  }

  currentLanguage = lang;

  try {
    localStorage.setItem('noon_language', lang);
  } catch {
    // ignore
  }

  if (typeof document !== 'undefined') {
    const isRtl = lang === 'ar' || supportedLanguages[lang]?.dir === 'rtl';
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }

  listeners.forEach((listener) => listener(lang));
}

/**
 * Creates a robust fallback proxy over target dictionary.
 * If a key or nested section is missing in target, it gracefully falls back to the English dictionary.
 * If even missing in English, returns a safe string instead of breaking the UI.
 */
function createFallbackProxy<T extends object>(target: T, fallback: any, path = ''): T {
  return new Proxy(target, {
    get(obj: any, prop: string | symbol) {
      if (typeof prop === 'symbol' || prop === 'then') {
        return obj[prop];
      }

      const val = obj[prop];
      const fallbackVal = fallback ? fallback[prop] : undefined;

      // If key exists and is non-null
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          return createFallbackProxy(val, fallbackVal, path ? `${path}.${String(prop)}` : String(prop));
        }
        return val;
      }

      // If missing in current language, fall back to English dictionary
      if (fallbackVal !== undefined && fallbackVal !== null) {
        if (typeof fallbackVal === 'object' && !Array.isArray(fallbackVal)) {
          return createFallbackProxy({}, fallbackVal, path ? `${path}.${String(prop)}` : String(prop));
        }
        return fallbackVal;
      }

      // If missing in both, return fallback representation or empty string instead of undefined crashing
      return '';
    },
  });
}

export function useI18n() {
  const [lang, setLangState] = useState<Language>(currentLanguage);

  useEffect(() => {
    const handler = (newLang: Language) => setLangState(newLang);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const rawDict = dictionaries[lang] || dictionaries.ar;
  const englishFallback = dictionaries.en;

  // Wrap with English fallback proxy to prevent UI breakage
  const dict = lang === 'en' ? rawDict : createFallbackProxy(rawDict, englishFallback);

  // Helper to interpolate params like {current} or {total} or {percent}
  const format = (template: string, params: Record<string, string | number>) => {
    if (!template || typeof template !== 'string') return '';
    return Object.entries(params).reduce((str, [key, val]) => {
      return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }, template);
  };

  const isRTL = lang === 'ar' || supportedLanguages[lang]?.dir === 'rtl';

  return {
    t: dict,
    lang,
    isRTL,
    setLanguage,
    format,
  };
}

export { ar, en };
export * from './types';
