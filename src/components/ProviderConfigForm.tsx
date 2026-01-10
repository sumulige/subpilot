'use client';

/**
 * Provider Config Form
 * 根据 Schema 自动生成配置表单
 * Supports dynamic model fetching and fuzzy search
 */

import { useState, useEffect, useCallback } from 'react';
import { registry } from '@/lib/providers';
import { fetchModels, supportsModelFetching } from '@/lib/providers/model-fetcher';
import type { ProviderConfig, FieldSchema } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useTranslation } from '@/lib/i18n/context';

interface ProviderConfigFormProps {
    providerId: string;
    config: ProviderConfig;
    onChange: (config: ProviderConfig) => void;
}

export function ProviderConfigForm({ providerId, config, onChange }: ProviderConfigFormProps) {
    const { t } = useTranslation();
    const schema = registry.getSchema(providerId);

    // Dynamic model state
    const [dynamicModels, setDynamicModels] = useState<string[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsFetched, setModelsFetched] = useState(false);

    const apiKey = config.apiKey as string | undefined;

    // Fetch models when API key changes
    const loadModels = useCallback(async () => {
        if (!apiKey || !supportsModelFetching(providerId)) {
            setDynamicModels([]);
            setModelsFetched(false);
            return;
        }

        setModelsLoading(true);
        try {
            const models = await fetchModels(providerId, apiKey);
            if (models.length > 0) {
                setDynamicModels(models);
                setModelsFetched(true);
            } else {
                setDynamicModels([]);
                setModelsFetched(false);
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
            setDynamicModels([]);
            setModelsFetched(false);
        } finally {
            setModelsLoading(false);
        }
    }, [providerId, apiKey]);

    // Debounced effect for fetching models
    useEffect(() => {
        if (!apiKey || apiKey.length < 10) {
            setDynamicModels([]);
            setModelsFetched(false);
            return;
        }

        const timer = setTimeout(() => {
            loadModels();
        }, 500); // Debounce 500ms

        return () => clearTimeout(timer);
    }, [apiKey, loadModels]);

    if (!schema) return null;

    const handleChange = (field: string, value: string | number | boolean) => {
        onChange({ ...config, [field]: value });
    };

    // Get model options (prefer dynamic, fallback to static)
    const getModelOptions = (field: FieldSchema): ComboboxOption[] => {
        const staticOptions = field.options || [];
        const models = modelsFetched && dynamicModels.length > 0 ? dynamicModels : staticOptions;

        return models.map((m) => ({
            value: m,
            label: m,
        }));
    };

    return (
        <div className="space-y-4">
            {(Object.entries(schema.fields) as [string, FieldSchema][]).map(([fieldName, field]) => (
                <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    {/* Model field: always use Combobox when dynamic models available */}
                    {fieldName === 'model' && supportsModelFetching(providerId) ? (
                        <Combobox
                            options={getModelOptions(field)}
                            value={(config[fieldName] as string) || (field.default as string) || ''}
                            onChange={(v) => handleChange(fieldName, v)}
                            placeholder={field.placeholder || t('settings.selectModel') || 'Select model...'}
                            searchPlaceholder={t('settings.searchModel') || 'Search or enter model ID...'}
                            emptyText={t('settings.noModels') || 'No models found'}
                            allowCustomValue={true}
                            loading={modelsLoading}
                        />
                    ) : field.type === 'string' && (
                        <Input
                            id={fieldName}
                            type={field.secret ? 'password' : 'text'}
                            placeholder={field.placeholder}
                            value={(config[fieldName] as string) || ''}
                            onChange={(e) => handleChange(fieldName, e.target.value)}
                        />
                    )}

                    {field.type === 'number' && (
                        <Input
                            id={fieldName}
                            type="number"
                            step="0.1"
                            value={(config[fieldName] as number) ?? field.default ?? ''}
                            onChange={(e) => handleChange(fieldName, parseFloat(e.target.value))}
                        />
                    )}

                    {field.type === 'boolean' && (
                        <Select
                            value={String(config[fieldName] ?? field.default)}
                            onValueChange={(v) => handleChange(fieldName, v === 'true')}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">{t('common.yes') || '是'}</SelectItem>
                                <SelectItem value="false">{t('common.no') || '否'}</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {field.type === 'select' && field.options && fieldName !== 'model' && (
                        <Select
                            value={(config[fieldName] as string) || (field.default as string)}
                            onValueChange={(v) => handleChange(fieldName, v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            ))}

            {/* Hint for dynamic models */}
            {supportsModelFetching(providerId) && !modelsFetched && apiKey && apiKey.length >= 10 && (
                <p className="text-xs text-muted-foreground">
                    {modelsLoading
                        ? (t('settings.loadingModels') || 'Loading models from API...')
                        : (t('settings.modelsHint') || 'Enter a valid API key to load available models')}
                </p>
            )}
            {modelsFetched && dynamicModels.length > 0 && (
                <p className="text-xs text-green-500">
                    ✓ {t('settings.modelsLoaded', { count: dynamicModels.length }) || `Loaded ${dynamicModels.length} models from API`}
                </p>
            )}
        </div>
    );
}
