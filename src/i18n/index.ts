import { useState, useEffect } from 'react';
import { ar } from './ar';
import { en } from './en';
import { TranslationDictionary } from './types';
import { isFeatureEnabled } from '../config/feature-flags';

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
      if (saved === 'en' && !isFeatureEnabled('englishLanguageEnabled')) {
        currentLanguage = 'ar';
      } else {
        currentLanguage = saved;
      }
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
  if (lang === 'en' && !isFeatureEnabled('englishLanguageEnabled')) {
    lang = 'ar';
  }
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
 * Creates a robust fallback proxy over target dictionary with memoized nested proxies
 * so object references remain 100% stable across React renders.
 */
function createFallbackProxy<T extends object>(target: T, fallback: any, path = ''): T {
  const childCache = new Map<string | symbol, any>();

  return new Proxy(target, {
    get(obj: any, prop: string | symbol) {
      if (typeof prop === 'symbol' || prop === 'then') {
        return obj[prop];
      }

      if (childCache.has(prop)) {
        return childCache.get(prop);
      }

      const val = obj[prop];
      const fallbackVal = fallback ? fallback[prop] : undefined;

      // If key exists and is non-null
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          const proxied = createFallbackProxy(
            val,
            fallbackVal,
            path ? `${path}.${String(prop)}` : String(prop)
          );
          childCache.set(prop, proxied);
          return proxied;
        }
        return val;
      }

      // If missing in current language, fall back to English dictionary
      if (fallbackVal !== undefined && fallbackVal !== null) {
        if (typeof fallbackVal === 'object' && !Array.isArray(fallbackVal)) {
          const proxied = createFallbackProxy(
            {},
            fallbackVal,
            path ? `${path}.${String(prop)}` : String(prop)
          );
          childCache.set(prop, proxied);
          return proxied;
        }
        return fallbackVal;
      }

      // If missing in both, return empty string instead of undefined crashing
      return '';
    },
  });
}

const dictProxyCache: Record<string, TranslationDictionary> = {};

function getProxiedDictionary(lang: Language): TranslationDictionary {
  if (dictProxyCache[lang]) {
    return dictProxyCache[lang];
  }
  const rawDict = dictionaries[lang] || dictionaries.ar;
  const englishFallback = dictionaries.en;
  const proxied =
    lang === 'en' ? rawDict : createFallbackProxy(rawDict, englishFallback);
  dictProxyCache[lang] = proxied;
  return proxied;
}

// Helper to interpolate params like {current} or {total} or {percent}
function formatTemplate(template: string, params: Record<string, string | number>): string {
  if (!template || typeof template !== 'string') return '';
  return Object.entries(params).reduce((str, [key, val]) => {
    return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }, template);
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

  const dict = getProxiedDictionary(lang);
  const isRTL = lang === 'ar' || supportedLanguages[lang]?.dir === 'rtl';

  return {
    t: dict,
    lang,
    isRTL,
    setLanguage,
    format: formatTemplate,
  };
}

export { ar, en };
export * from './types';
