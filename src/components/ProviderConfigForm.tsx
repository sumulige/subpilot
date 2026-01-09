'use client';

/**
 * Provider Config Form
 * 根据 Schema 自动生成配置表单
 */

import { registry } from '@/lib/providers';
import type { ProviderConfig, FieldSchema } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProviderConfigFormProps {
    providerId: string;
    config: ProviderConfig;
    onChange: (config: ProviderConfig) => void;
}

export function ProviderConfigForm({ providerId, config, onChange }: ProviderConfigFormProps) {
    const schema = registry.getSchema(providerId);
    if (!schema) return null;

    const handleChange = (field: string, value: string | number | boolean) => {
        onChange({ ...config, [field]: value });
    };

    return (
        <div className="space-y-4">
            {(Object.entries(schema.fields) as [string, FieldSchema][]).map(([fieldName, field]) => (
                <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    {field.type === 'string' && (
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
                                <SelectItem value="true">是</SelectItem>
                                <SelectItem value="false">否</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {field.type === 'select' && field.options && (
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
        </div>
    );
}
