'use client';

/**
 * Provider Selector Component
 * 翻译服务选择器
 */

import { registry } from '@/lib/providers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProviderSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
    const schemas = registry.list();
    const apiProviders = schemas.filter((s) => s.type === 'api');
    const llmProviders = schemas.filter((s) => s.type === 'llm');

    return (
        <div className="space-y-2">
            <Label>翻译服务</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="选择翻译服务" />
                </SelectTrigger>
                <SelectContent>
                    {apiProviders.length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                传统 API
                            </div>
                            {apiProviders.map((schema) => (
                                <SelectItem key={schema.id} value={schema.id}>
                                    {schema.name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                    {llmProviders.length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                AI 大模型
                            </div>
                            {llmProviders.map((schema) => (
                                <SelectItem key={schema.id} value={schema.id}>
                                    {schema.name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
