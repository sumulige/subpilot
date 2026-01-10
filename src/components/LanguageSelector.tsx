'use client';

/**
 * Language Selector Component
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { useTranslation } from '@/lib/i18n/context';

const COMMON_LANGUAGES = [
    { code: 'auto', name: 'settings.autoDetect', isKey: true },
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'ru', name: 'Русский' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' },
    { code: 'ar', name: 'العربية' },
    { code: 'th', name: 'ไทย' },
    { code: 'vi', name: 'Tiếng Việt' },
];

interface LanguageSelectorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    showAuto?: boolean;
}

export function LanguageSelector({ label, value, onChange, showAuto = false }: LanguageSelectorProps) {
    const { t } = useTranslation();

    const languages = COMMON_LANGUAGES
        .filter((l) => showAuto || l.code !== 'auto')
        .map(l => ({
            code: l.code,
            name: l.isKey ? t(l.name) : l.name
        }));

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
