'use client';

import { useState } from 'react';
import {
  Upload,
  Settings2,
  ChevronDown,
  Play,
  Download,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FileUploader,
  ProviderSelector,
  ProviderConfigForm,
  LanguageSelector,
  AdvancedSettings,
} from '@/components';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import type { ProviderConfig, SubtitleMode } from '@/lib/types';
import type { BatcherConfig } from '@/lib/engine/batcher';
import type { FileProgress } from '@/lib/types/file-progress';
import type { JobStatus } from '@/lib/job';

export interface WorkbenchControlRailProps {
  fileCount: number;
  totalLines: number;
  onFilesSelected: (files: File[]) => void;
  subtitleMode: SubtitleMode;
  onSubtitleModeChange: (mode: SubtitleMode) => void;
  providerId: string;
  onProviderIdChange: (id: string) => void;
  providerConfig: ProviderConfig;
  onProviderConfigChange: (config: ProviderConfig) => void;
  sourceLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;
  batcherConfig: Partial<BatcherConfig>;
  onBatcherConfigChange: (config: Partial<BatcherConfig>) => void;
  temperature: number;
  onTemperatureChange: (v: number) => void;
  debugMode: boolean;
  onDebugModeChange: (v: boolean) => void;
  glossaryText: string;
  onGlossaryTextChange: (v: string) => void;
  error: string | null;
  fileProgresses: FileProgress[];
  activeFileIndex: number;
  onActiveFileIndexChange: (i: number) => void;
  isTranslating: boolean;
  jobStatus: JobStatus;
  hasResults: boolean;
  onStart: () => void;
  onCancel: () => void;
  onDownload: () => void;
}

export function WorkbenchControlRail(props: WorkbenchControlRailProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const completedFiles = props.fileProgresses.filter(
    (p) => p.status === 'completed'
  ).length;

  return (
    <aside className="flex flex-col gap-3">
      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Upload className="size-3.5" strokeWidth={1.75} />
          {t('common.upload')}
        </div>
        <FileUploader onFilesSelected={props.onFilesSelected} />
        {props.fileCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('common.uploadHint', {
              count: props.fileCount,
              lines: props.totalLines,
            })}
          </p>
        )}
      </section>

      <section className="panel space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Settings2 className="size-3.5" strokeWidth={1.75} />
            {t('common.settings')}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={props.subtitleMode === 'bilingual'}
              onCheckedChange={(checked) =>
                props.onSubtitleModeChange(
                  checked ? 'bilingual' : 'translate_only'
                )
              }
            />
            <span className="text-xs text-muted-foreground">
              {props.subtitleMode === 'bilingual'
                ? t('settings.bilingual')
                : t('settings.targetOnly')}
            </span>
          </div>
        </div>

        <ProviderSelector
          value={props.providerId}
          onChange={props.onProviderIdChange}
        />
        <ProviderConfigForm
          providerId={props.providerId}
          config={props.providerConfig}
          onChange={props.onProviderConfigChange}
        />

        <div className="grid grid-cols-2 gap-3">
          <LanguageSelector
            label={t('settings.sourceLang')}
            value={props.sourceLanguage}
            onChange={props.onSourceLanguageChange}
            showAuto
          />
          <LanguageSelector
            label={t('settings.targetLang')}
            value={props.targetLanguage}
            onChange={props.onTargetLanguageChange}
          />
        </div>
      </section>

      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="panel flex w-full items-center justify-between px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{t('common.advanced')}</span>
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                settingsOpen && 'rotate-180'
              )}
              strokeWidth={1.75}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="panel mt-2 space-y-4 p-4">
          <AdvancedSettings
            config={props.batcherConfig}
            onConfigChange={props.onBatcherConfigChange}
            temperature={props.temperature}
            onTemperatureChange={props.onTemperatureChange}
            debugMode={props.debugMode}
            glossaryText={props.glossaryText}
            onGlossaryTextChange={props.onGlossaryTextChange}
          />
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Switch
              id="debug-mode"
              checked={props.debugMode}
              onCheckedChange={props.onDebugModeChange}
            />
            <Label htmlFor="debug-mode" className="text-sm">
              {t('advanced.debugMode')}
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <section className="panel p-4">
        {props.error && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {props.error}
          </div>
        )}

        {props.fileProgresses.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {props.fileProgresses.map((fp, idx) => (
              <button
                key={fp.fileIndex}
                type="button"
                onClick={() => props.onActiveFileIndexChange(idx)}
                className={cn(
                  'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                  idx === props.activeFileIndex
                    ? 'border-brand/40 bg-brand/10'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-foreground">
                    {fp.fileName}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      fp.status === 'completed' && 'text-brand',
                      fp.status === 'error' && 'text-destructive',
                      fp.status === 'translating' && 'text-brand',
                      fp.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {fp.status === 'completed' && t('status.completed')}
                    {fp.status === 'error' && t('status.error')}
                    {fp.status === 'translating' && t('status.translating')}
                    {fp.status === 'pending' && t('status.pending')}
                  </span>
                </div>
                <div className="relative h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                      fp.status === 'completed' && 'bg-brand',
                      fp.status === 'error' && 'bg-destructive',
                      (fp.status === 'translating' || fp.status === 'pending') &&
                        'bg-brand'
                    )}
                    style={{
                      width: `${fp.total > 0 ? (fp.current / fp.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                {fp.status === 'translating' && fp.total > 0 && (
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {fp.current}/{fp.total} (
                    {Math.round((fp.current / fp.total) * 100)}%)
                  </div>
                )}
              </button>
            ))}

            {props.isTranslating && (
              <p className="pt-1 text-center text-xs text-muted-foreground">
                {t('status.fileProgress', {
                  completed: completedFiles,
                  total: props.fileProgresses.length,
                })}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {props.isTranslating ? (
            <Button
              variant="outline"
              onClick={props.onCancel}
              className="flex-1"
            >
              <Square className="size-3.5" strokeWidth={1.75} />
              {t('common.cancel')}
            </Button>
          ) : (
            <Button
              onClick={props.onStart}
              disabled={props.fileCount === 0}
              className="flex-1"
            >
              <Play className="size-4" strokeWidth={1.75} />
              {props.jobStatus === 'paused'
                ? t('common.continue')
                : props.fileProgresses.some((p) => p.status === 'error')
                  ? t('common.retryFailed')
                  : t('common.start')}
            </Button>
          )}

          {props.hasResults && (
            <Button variant="outline" onClick={props.onDownload}>
              <Download className="size-4" strokeWidth={1.75} />
              {t('common.download')}
            </Button>
          )}
        </div>
      </section>
    </aside>
  );
}
