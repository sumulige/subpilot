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

interface AdvancedSettingsProps {
    config: Partial<BatcherConfig>;
    onConfigChange: (config: Partial<BatcherConfig>) => void;
    temperature: number;
    onTemperatureChange: (temp: number) => void;
}

export function AdvancedSettings({ config, onConfigChange, temperature, onTemperatureChange }: AdvancedSettingsProps) {
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
                        展开更多自定义选项 <span className="text-xl">👉</span>
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
                                    每秒最大请求数
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    请求数超过该限制时会进入排队状态，直到下一秒钟开始。
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
                                    每次请求最大文本长度
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    每次请求最大字符数，太大会导致接口的响应变慢，因此可以尝试调整该选项来优化速度
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
                                    每次请求最大段落数
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    每次发送给翻译服务的段落数量，如果段落数量过多，可能会导致接口的响应变慢
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
                                    启用富文本翻译
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    开启富文本翻译可保留原文的链接和样式效果 (HTML 标签处理)
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
                                    <span role="img" aria-label="brain">🧠</span> TACTIC-Lite (高精度模式)
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    开启后通过"思考-翻译"双步流程增强语境理解。能显著提升质量，但会消耗 2 倍 API 额度。
                                </p>
                            </div>
                            <Switch
                                checked={config.tacticLite ?? false}
                                onCheckedChange={(checked) => handleChange('tacticLite', checked)}
                            />
                        </div>
                    </div>

                    {/* Section 2: Prompts */}
                    <div className="space-y-6 pt-6 border-t border-border">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                System Prompt:
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
                                Subtitle Prompt:
                                <Info className="h-3 w-3 text-muted-foreground" />
                            </Label>
                            <Textarea
                                rows={3}
                                value={config.userPromptTemplate ?? DEFAULT_USER_PROMPT}
                                onChange={(e) => handleChange('userPromptTemplate', e.target.value)}
                                className="font-mono text-xs bg-background"
                            />
                            <p className="text-xs text-muted-foreground">
                                控制用户消息格式。变量: <code>{`{{to}}`}</code>, <code>{`{{from}}`}</code>, <code>{`{{text}}`}</code>
                            </p>
                        </div>
                    </div>

                    {/* Section 3: Temperature */}
                    <div className="space-y-6 pt-6 border-t border-border">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    Temperature:
                                </Label>
                                <p className="text-xs text-muted-foreground max-w-lg">
                                    采样发散度，值越小，生成的内容越固定。当取0时，模型生成时几乎总是会选取概率最大的Token（词元）
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
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end">
                        <Button
                            variant="link"
                            className="text-muted-foreground hover:text-foreground text-sm"
                            onClick={handleReset}
                        >
                            恢复为默认设置
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
