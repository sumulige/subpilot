'use client';

import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();

    return (
        <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
            <button
                type="button"
                onClick={() => setLocale('en')}
                className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    locale === 'en'
                        ? 'bg-background text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLocale('zh')}
                className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    locale === 'zh'
                        ? 'bg-background text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            >
                中文
            </button>
        </div>
    );
}
