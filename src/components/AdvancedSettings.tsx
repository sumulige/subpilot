'use client';

import { Info } from 'lucide-react';
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
  DEFAULT_CONFIG,
} from '@/lib/engine/batcher';
import { useTranslation } from '@/lib/i18n/context';

interface AdvancedSettingsProps {
  config: Partial<BatcherConfig>;
  onConfigChange: (config: Partial<BatcherConfig>) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  debugMode?: boolean;
  glossaryText?: string;
  onGlossaryTextChange?: (text: string) => void;
}

/** 高级设置表单（单一入口内容区，外层由 ControlRail Collapsible 承载） */
export function AdvancedSettings({
  config,
  onConfigChange,
  temperature,
  onTemperatureChange,
  debugMode = false,
  glossaryText = '',
  onGlossaryTextChange,
}: AdvancedSettingsProps) {
  const { t } = useTranslation();

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
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            {t('advanced.maxRequests')}
            <Info className="size-3 text-muted-foreground" strokeWidth={1.75} />
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('advanced.maxRequestsDesc')}
          </p>
          <Input
            type="number"
            value={config.maxRequestsPerSecond ?? 5}
            onChange={(e) =>
              handleChange(
                'maxRequestsPerSecond',
                parseInt(e.target.value, 10) || 0
              )
            }
            className="max-w-[8rem] bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t('advanced.maxChars')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('advanced.maxCharsDesc')}
          </p>
          <Input
            type="number"
            value={config.maxCharsPerBatch ?? 1200}
            onChange={(e) =>
              handleChange('maxCharsPerBatch', parseInt(e.target.value, 10) || 0)
            }
            className="max-w-[8rem] bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t('advanced.maxLines')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('advanced.maxLinesDesc')}
          </p>
          <Input
            type="number"
            value={config.maxLinesPerBatch ?? 5}
            onChange={(e) =>
              handleChange('maxLinesPerBatch', parseInt(e.target.value, 10) || 0)
            }
            className="max-w-[8rem] bg-background"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-sm">{t('advanced.richText')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('advanced.richTextDesc')}
            </p>
          </div>
          <Switch
            checked={config.richText ?? true}
            onCheckedChange={(checked) => handleChange('richText', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-sm">{t('advanced.tacticLite')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('advanced.tacticLiteDesc')}
            </p>
          </div>
          <Switch
            checked={config.tacticLite ?? false}
            onCheckedChange={(checked) => handleChange('tacticLite', checked)}
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Label className="text-sm">{t('advanced.glossary')}</Label>
        <p className="text-xs text-muted-foreground">{t('advanced.glossaryDesc')}</p>
        <Textarea
          value={glossaryText}
          onChange={(e) => onGlossaryTextChange?.(e.target.value)}
          placeholder={t('advanced.glossaryPlaceholder')}
          className="min-h-[100px] bg-background font-mono text-xs"
        />
      </div>

      {debugMode && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label className="text-sm">{t('advanced.systemPrompt')}</Label>
            <Textarea
              value={config.systemPromptTemplate ?? SYSTEM_PROMPT}
              onChange={(e) =>
                handleChange('systemPromptTemplate', e.target.value)
              }
              className="min-h-[160px] bg-background font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t('advanced.subtitlePrompt')}</Label>
            <Textarea
              rows={3}
              value={config.userPromptTemplate ?? DEFAULT_USER_PROMPT}
              onChange={(e) =>
                handleChange('userPromptTemplate', e.target.value)
              }
              className="bg-background font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {t('advanced.subtitlePromptDesc')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <div className="space-y-1">
          <Label className="text-sm">{t('advanced.temperature')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('advanced.temperatureDesc')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Slider
            value={[temperature]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([val]) => onTemperatureChange(val)}
            className="w-32"
          />
          <span className="w-8 text-center font-mono text-sm tabular-nums">
            {temperature}
          </span>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
            onClick={handleReset}
          >
            {t('common.restoreDefaults')}
          </Button>
        </div>
      </div>
    </div>
  );
}
