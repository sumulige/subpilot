import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { BatcherConfig } from '@/lib/engine/batcher';

interface SettingsDialogProps {
    config: Partial<BatcherConfig>;
    onConfigChange: (config: Partial<BatcherConfig>) => void;
}

const SYSTEM_PROMPT_TEMPLATE = `You are a professional {{to}} native translator who needs to fluently translate text into {{to}}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output{{title_prompt}}{{summary_prompt}}{{terms_prompt}}

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations

## Examples
### Multi-paragraph Input:
Paragraph A
%%
Paragraph B
%%
Paragraph C
%%
Paragraph D

### Multi-paragraph Output:
Translation A
%%
Translation B
%%
Translation C
%%
Translation D

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators`;

export function SettingsDialog({ config, onConfigChange }: SettingsDialogProps) {
    // Local state for temporary changes
    const [localConfig, setLocalConfig] = useState(config);
    const [open, setOpen] = useState(false);

    // Sync when config prop changes
    useEffect(() => {
        setLocalConfig(config);
    }, [config, open]);

    const handleSave = () => {
        onConfigChange(localConfig);
        setOpen(false);
    };

    const handleChange = (field: keyof BatcherConfig, value: any) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>高级设置 (Advanced Settings)</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="general">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">性能与安全</TabsTrigger>
                        <TabsTrigger value="prompt">提示词工程 (Prompt)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label>每秒最大请求数 (RPS Limit)</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                        value={[localConfig.maxRequestsPerSecond || 5]}
                                        min={1}
                                        max={20}
                                        step={1}
                                        onValueChange={([val]: number[]) => handleChange('maxRequestsPerSecond', val)}
                                        className="flex-1"
                                    />
                                    <span className="w-12 text-center text-sm font-mono">
                                        {localConfig.maxRequestsPerSecond || 0}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    限制 API 调用频率以避免 429 错误 (0 表示无限制)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>每批最大字符数</Label>
                                <Input
                                    type="number"
                                    value={localConfig.maxCharsPerBatch || 1000}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('maxCharsPerBatch', parseInt(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    单次请求发送的最大字符数 (推荐 1000-2000)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>每批最大行数</Label>
                                <Input
                                    type="number"
                                    value={localConfig.maxLinesPerBatch || 20}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('maxLinesPerBatch', parseInt(e.target.value))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>并发数 (Concurrency)</Label>
                                <Input
                                    type="number"
                                    value={localConfig.concurrency || 2}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('concurrency', parseInt(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    并行请求数量。较高的并发数需要配合更高的 RPS 限制。
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="prompt" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>System Prompt 模板</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('systemPromptTemplate', SYSTEM_PROMPT_TEMPLATE)}
                                    title="恢复默认设置"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> 重置
                                </Button>
                            </div>
                            <Textarea
                                value={localConfig.systemPromptTemplate || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('systemPromptTemplate', e.target.value)}
                                className="h-[400px] font-mono text-xs"
                                placeholder="输入自定义 System Prompt..."
                            />
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>可用变量:</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li><code>{`{{to}}`}</code> - 目标语言 (例如 "Simplified Chinese")</li>
                                    <li><code>{`{{from}}`}</code> - 源语言</li>
                                </ul>
                                <p className="mt-2 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    重要：请确保 Prompt 指示模型使用 <code>%%</code> 作为段落分隔符。
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                    <Button onClick={handleSave}>保存更改</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
