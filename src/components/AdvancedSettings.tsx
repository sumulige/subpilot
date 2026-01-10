import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    type BatcherConfig,
    SYSTEM_PROMPT,
    DEFAULT_USER_PROMPT,
    DEFAULT_CONFIG
} from '@/lib/engine/batcher';
import { useTranslation } from '@/lib/i18n/context';

interface AdvancedSettingsProps {
    config: Partial<BatcherConfig>;
    onConfigChange: (config: Partial<BatcherConfig>) => void;
    temperature: number;
    onTemperatureChange: (temp: number) => void;
    qualityEvalEnabled?: boolean;
    onQualityEvalChange?: (enabled: boolean) => void;
    debugMode?: boolean;
    glossaryText?: string;
    onGlossaryTextChange?: (text: string) => void;
}

export function AdvancedSettings({
    config,
    onConfigChange,
    temperature,
    onTemperatureChange,
    qualityEvalEnabled = false,
    onQualityEvalChange,
    debugMode = false,
    glossaryText = '',
    onGlossaryTextChange,
}: AdvancedSettingsProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field: keyof BatcherConfig, value: unknown) => {
        onConfigChange({ ...config, [field]: value });
    };

    const handleReset = () => {
        onConfigChange({
            maxRequestsPerSecond: DEFAULT_CONFIG.maxRequestsPerSecond,
            maxCharsPerBatch: DEFAULT_CONFIG.maxCharsPerBatch,
            maxLinesPerBatch: DEFAULT_CONFIG.maxLinesPerBatch,
            richText: DEFAULT_CONFIG.richText,
            systemPromptTemplate: SYSTEM_PROMPT,
            userPromptTemplate: DEFAULT_USER_PROMPT,
        });
        onTemperatureChange(0);
    };

    return (
        <div className="w-full bg-card/50 border rounded-xl overflow-hidden transition-all duration-300">
            {/* Header / Toggle */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
                        {t('common.expandOptions')} <span className="text-xl">👉</span>
                    </h2>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-6 space-y-8 animate-in slide-in-from-top-2">
                    {/* Section 1: Limits */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.maxRequests')}
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.maxRequestsDesc')}
                                </p>
                            </div>
                            <Input
                                type="number"
                                value={config.maxRequestsPerSecond ?? 5}
                                onChange={(e) => handleChange('maxRequestsPerSecond', parseInt(e.target.value) || 0)}
                                className="w-full md:w-32 bg-background"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.maxChars')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.maxCharsDesc')}
                                </p>
                            </div>
                            <Input
                                type="number"
                                value={config.maxCharsPerBatch ?? 1200}
                                onChange={(e) => handleChange('maxCharsPerBatch', parseInt(e.target.value) || 0)}
                                className="w-full md:w-32 bg-background"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.maxLines')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.maxLinesDesc')}
                                </p>
                            </div>
                            <Input
                                type="number"
                                value={config.maxLinesPerBatch ?? 5}
                                onChange={(e) => handleChange('maxLinesPerBatch', parseInt(e.target.value) || 0)}
                                className="w-full md:w-32 bg-background"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.richText')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.richTextDesc')}
                                </p>
                            </div>
                            <Switch
                                checked={config.richText ?? true}
                                onCheckedChange={(checked) => handleChange('richText', checked)}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    <span role="img" aria-label="brain">🧠</span> {t('advanced.tacticLite')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.tacticLiteDesc')}
                                </p>
                            </div>
                            <Switch
                                checked={config.tacticLite ?? false}
                                onCheckedChange={(checked) => handleChange('tacticLite', checked)}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    <span role="img" aria-label="magnifier">🔍</span> {t('advanced.qualityEval')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.qualityEvalDesc')}
                                </p>
                            </div>
                            <Switch
                                checked={qualityEvalEnabled}
                                onCheckedChange={(checked) => onQualityEvalChange?.(checked)}
                            />
                        </div>
                    </div>

                    {/* Section: Glossary (RAG) */}
                    <div className="flex flex-col gap-4 pt-4 border-t border-dashed border-border/50">
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                                <span role="img" aria-label="book">📖</span> {t('advanced.glossary')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t('advanced.glossaryDesc')}
                            </p>
                        </div>
                        <Textarea
                            value={glossaryText}
                            onChange={(e) => onGlossaryTextChange?.(e.target.value)}
                            placeholder={t('advanced.glossaryPlaceholder')}
                            className="min-h-[100px] font-mono text-xs bg-background"
                        />
                    </div>

                    {/* Section 2: Prompts (Debug Mode Only) */}
                    {debugMode && (
                        <div className="space-y-6 pt-6 border-t border-border">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.systemPrompt')}
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </Label>
                                <Textarea
                                    value={config.systemPromptTemplate ?? SYSTEM_PROMPT}
                                    onChange={(e) => handleChange('systemPromptTemplate', e.target.value)}
                                    className="min-h-[200px] font-mono text-xs bg-background"
                                />
                            </div>

                            {/* Subtitle Prompt (User Prompt Template) */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.subtitlePrompt')}
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </Label>
                                <Textarea
                                    rows={3}
                                    value={config.userPromptTemplate ?? DEFAULT_USER_PROMPT}
                                    onChange={(e) => handleChange('userPromptTemplate', e.target.value)}
                                    className="font-mono text-xs bg-background"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('advanced.subtitlePromptDesc')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Section 3: Temperature */}
                    <div className="space-y-6 pt-6 border-t border-border">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    {t('advanced.temperature')}
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    {t('advanced.temperatureDesc')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <Slider
                                    value={[temperature]}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    onValueChange={([val]) => onTemperatureChange(val)}
                                    className="w-32"
                                />
                                <span className="w-8 text-center font-mono text-sm">{temperature}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 flex justify-end">
                            <Button
                                variant="link"
                                className="text-muted-foreground hover:text-foreground text-sm"
                                onClick={handleReset}
                            >
                                {t('common.restoreDefaults')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
