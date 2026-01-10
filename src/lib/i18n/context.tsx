'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, Locale } from './dictionaries';

// Type inference for nested keys is hard, so we just use the structure of 'zh' as the base
type Dictionary = typeof dictionaries.zh;

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dict: Dictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    // Lazy initialization to avoid setState in effect
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('locale');
            if (stored === 'en' || stored === 'zh') return stored;
        }
        return 'zh';
    });

    const setLocale = (l: Locale) => {
        setLocaleState(l);
        localStorage.setItem('locale', l);
    };

    const dict = dictionaries[locale];

    const t = (path: string, params?: Record<string, string | number>) => {
        const keys = path.split('.');
        let value: any = dict;
        for (const k of keys) {
            value = value?.[k];
        }
        if (typeof value !== 'string') return path;

        if (params) {
            return Object.entries(params).reduce((acc, [key, val]) => {
                return acc.replace(`{${key}}`, String(val));
            }, value);
        }
        return value;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t, dict }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useTranslation must be used within I18nProvider');
    return context;
}
