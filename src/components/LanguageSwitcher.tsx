'use client';
import { useTranslation } from '@/lib/i18n/context';

export function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();

    return (
        <div className="flex items-center bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-1">
            <button
                onClick={() => setLocale('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-300 ${locale === 'en' ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'}`}
            >
                EN
            </button>
            <button
                onClick={() => setLocale('zh')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-300 ${locale === 'zh' ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'}`}
            >
                中文
            </button>
        </div>
    );
}
