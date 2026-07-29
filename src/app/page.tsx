'use client';

/**
 * SubPilot 工作台入口
 * 偏好持久化在此；翻译编排全部经 JobService
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage, useTranslationJob } from '@/hooks';
import { SessionRecoveryDialog } from '@/components';
import { WorkbenchHeader } from '@/components/workbench/WorkbenchHeader';
import { WorkbenchControlRail } from '@/components/workbench/WorkbenchControlRail';
import { WorkbenchPreview } from '@/components/workbench/WorkbenchPreview';
import { registry } from '@/lib/providers';
import type { ProviderConfig, SubtitleMode } from '@/lib/types';
import type { JobRunConfig } from '@/lib/job';

type BatcherPrefs = JobRunConfig['batcherConfig'];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const job = useTranslationJob();

  const [providerId, setProviderId] = useLocalStorage('providerId', 'nvidia');
  const [providerConfigs, setProviderConfigs] = useLocalStorage<
    Record<string, ProviderConfig>
  >('providerConfigs', {});
  const providerConfig = useMemo(
    () => providerConfigs[providerId] || {},
    [providerConfigs, providerId]
  );
  const setProviderConfig = useCallback(
    (config: ProviderConfig) => {
      setProviderConfigs((prev) => ({ ...prev, [providerId]: config }));
    },
    [providerId, setProviderConfigs]
  );

  useEffect(() => {
    if (!mounted) return;
    const validIds = registry.list().map((s) => s.id);
    if (providerId && !validIds.includes(providerId)) {
      const fallback = validIds.includes('nvidia') ? 'nvidia' : validIds[0];
      if (fallback) setProviderId(fallback);
    }
  }, [mounted, providerId, setProviderId]);

  const [sourceLanguage, setSourceLanguage] = useLocalStorage(
    'sourceLanguage',
    'auto'
  );
  const [targetLanguage, setTargetLanguage] = useLocalStorage(
    'targetLanguage',
    'zh'
  );
  const [subtitleMode, setSubtitleMode] = useLocalStorage<SubtitleMode>(
    'subtitleMode',
    'bilingual'
  );
  const [temperature, setTemperature] = useLocalStorage('temperature', 0);
  const [batcherConfig, setBatcherConfig] = useLocalStorage<BatcherPrefs>(
    'batcherConfig',
    {}
  );
  const [debugMode, setDebugMode] = useLocalStorage('debugMode', false);
  const [glossaryText, setGlossaryText] = useLocalStorage('glossaryText', '');

  const runConfig = useMemo<JobRunConfig>(
    () => ({
      providerId,
      providerConfig,
      sourceLanguage,
      targetLanguage,
      subtitleMode,
      temperature,
      batcherConfig,
      debugMode,
      glossaryText,
    }),
    [
      providerId,
      providerConfig,
      sourceLanguage,
      targetLanguage,
      subtitleMode,
      temperature,
      batcherConfig,
      debugMode,
      glossaryText,
    ]
  );

  const handleRecover = useCallback(async () => {
    const session = job.pendingRecovery;
    if (!session) return;
    setSourceLanguage(session.config.sourceLanguage);
    setTargetLanguage(session.config.targetLanguage);
    setProviderId(session.config.providerId);
    setSubtitleMode(session.config.subtitleMode);
    await job.recoverAndStart({
      ...runConfig,
      sourceLanguage: session.config.sourceLanguage,
      targetLanguage: session.config.targetLanguage,
      providerId: session.config.providerId,
      subtitleMode: session.config.subtitleMode,
    });
  }, [
    job,
    runConfig,
    setSourceLanguage,
    setTargetLanguage,
    setProviderId,
    setSubtitleMode,
  ]);

  if (!mounted) return null;

  const totalLines = job.subtitles.reduce((s, x) => s + x.lines.length, 0);
  const currentName = job.fileProgresses[job.activeFileIndex]?.fileName;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {job.pendingRecovery && (
        <SessionRecoveryDialog
          session={job.pendingRecovery}
          onRecover={handleRecover}
          onDiscard={job.discardRecovery}
        />
      )}

      <WorkbenchHeader />

      <main className="mx-auto max-w-[1400px] px-4 py-5">
        <div className="grid min-h-[calc(100dvh-7.5rem)] gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,24rem)_1fr]">
          <WorkbenchControlRail
            fileCount={job.files.length}
            totalLines={totalLines}
            onFilesSelected={job.loadFiles}
            subtitleMode={subtitleMode}
            onSubtitleModeChange={setSubtitleMode}
            providerId={providerId}
            onProviderIdChange={setProviderId}
            providerConfig={providerConfig}
            onProviderConfigChange={setProviderConfig}
            sourceLanguage={sourceLanguage}
            onSourceLanguageChange={setSourceLanguage}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={setTargetLanguage}
            batcherConfig={batcherConfig}
            onBatcherConfigChange={setBatcherConfig}
            temperature={temperature}
            onTemperatureChange={setTemperature}
            debugMode={debugMode}
            onDebugModeChange={setDebugMode}
            glossaryText={glossaryText}
            onGlossaryTextChange={setGlossaryText}
            error={job.error}
            fileProgresses={job.fileProgresses}
            activeFileIndex={job.activeFileIndex}
            onActiveFileIndexChange={job.setActiveFileIndex}
            isTranslating={job.isTranslating}
            jobStatus={job.status}
            hasResults={job.results.length > 0}
            onStart={() => job.start(runConfig)}
            onCancel={job.cancel}
            onDownload={() => job.downloadAll(subtitleMode, targetLanguage)}
          />

          <WorkbenchPreview
            fileName={currentName}
            isTranslating={job.isTranslating}
            lines={job.liveLines}
            onEditLine={job.editCue}
          />
        </div>
      </main>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        <a
          href="https://github.com/sumulige/subpilot"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          SubPilot
        </a>
        <span className="mx-1.5">-</span>
        <a
          href="https://gengnuo-1257145452.cos.ap-beijing.myqcloud.com/uPic/2024-11-21/14:10:19-InQEtF.png"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          sumulige
        </a>
      </footer>
    </div>
  );
}
