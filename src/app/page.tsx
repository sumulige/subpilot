'use client';

/**
 * SubPilot - Main Page (Redesigned)
 * Dark glass theme with split-panel layout and real-time preview
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks';
import { Button } from '@/components/ui/button';
import {
  FileUploader,
  ProviderSelector,
  ProviderConfigForm,
  LanguageSelector,
  AdvancedSettings,
  VirtualTranslationList,
  SessionRecoveryDialog,
} from '@/components';
import { Switch } from '@/components/ui/switch';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/context';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { registry } from '@/lib/providers';
import { getParser, detectFormat } from '@/lib/parsers';
import { translateSubtitle } from '@/lib/engine';
import { parseGlossary } from '@/lib/engine/glossary';
import { type BatcherConfig, type TranslationBatch } from '@/lib/engine/batcher';
import { type FileProgress, initFileProgresses } from '@/lib/types/file-progress';
import {
  type TranslationSession,
  getSession,
  clearSession,
  createSession,
  saveSession,
  addCompletedBatch,
  updateFileProgress,
  filesToStoredFiles,
} from '@/lib/engine/translation-session';
import type { ProviderConfig, Subtitle } from '@/lib/types';

export default function Home() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // File state
  const [files, setFiles] = useState<File[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  // Provider state (persisted)
  const [providerId, setProviderId] = useLocalStorage('providerId', 'nvidia');
  const [providerConfigs, setProviderConfigs] = useLocalStorage<Record<string, ProviderConfig>>('providerConfigs', {});

  const providerConfig = providerConfigs[providerId] || {};
  const setProviderConfig = useCallback((config: ProviderConfig) => {
    setProviderConfigs((prev) => ({ ...prev, [providerId]: config }));
  }, [providerId, setProviderConfigs]);

  // Validate providerId on mount
  useEffect(() => {
    if (mounted) {
      const schemas = registry.list();
      const validIds = schemas.map(s => s.id);
      if (providerId && !validIds.includes(providerId)) {
        console.warn(`[SubPilot] Invalid providerId '${providerId}' detected. Resetting to default.`);
        const fallback = validIds.includes('nvidia') ? 'nvidia' : validIds[0];
        if (fallback) setProviderId(fallback);
      }
    }
  }, [mounted, providerId, setProviderId]);

  // Language state (persisted)
  const [sourceLanguage, setSourceLanguage] = useLocalStorage('sourceLanguage', 'auto');
  const [targetLanguage, setTargetLanguage] = useLocalStorage('targetLanguage', 'zh');

  // Config state (persisted)
  const [subtitleMode, setSubtitleMode] = useLocalStorage<'bilingual' | 'translate_only'>('subtitleMode', 'bilingual');
  const [temperature, setTemperature] = useLocalStorage('temperature', 0);
  const [batcherConfig, setBatcherConfig] = useLocalStorage<Partial<BatcherConfig>>('batcherConfig', {});
  const [debugMode, setDebugMode] = useLocalStorage('debugMode', false);
  const [qualityEvalEnabled, setQualityEvalEnabled] = useLocalStorage('qualityEvalEnabled', false);
  const [glossaryText, setGlossaryText] = useLocalStorage('glossaryText', '');

  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [results, setResults] = useState<Subtitle[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Multi-file progress
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [fileBatches, setFileBatches] = useState<Record<number, TranslationBatch[]>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Session recovery
  const [pendingSession, setPendingSession] = useState<TranslationSession | null>(null);

  // Check for recoverable session on mount
  useEffect(() => {
    if (mounted) {
      const session = getSession();
      if (session && session.fileProgresses.some(fp =>
        fp.status === 'pending' || fp.status === 'translating'
      )) {
        setPendingSession(session);
      }
    }
  }, [mounted]);

  // Handle file selection
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(null);
    setFileBatches({});
    setFileProgresses([]);

    const parsed: Subtitle[] = [];
    for (const file of selectedFiles) {
      const format = detectFormat(file.name);
      if (!format) continue;

      const text = await file.text();
      const parser = getParser(format);
      parsed.push(parser.parse(text));
    }
    setSubtitles(parsed);
  }, []);

  // Start translation - per-file sequential
  const handleTranslate = useCallback(async () => {
    if (subtitles.length === 0) {
      setError('请先上传字幕文件');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setResults([]);
    setFileBatches({});

    // Initialize file progresses
    const progresses = initFileProgresses(files, subtitles);
    setFileProgresses(progresses);
    setActiveFileIndex(0);

    // Create session for checkpoint/resume
    const storedFiles = await filesToStoredFiles(files);
    const session = createSession(storedFiles, {
      sourceLanguage,
      targetLanguage,
      providerId,
      modelId: String(providerConfig.modelId || ''),
      subtitleMode,
    });
    saveSession(session);

    const provider = registry.get(providerId, providerConfig);
    const translatedSubtitles: Subtitle[] = [];

    try {
      // Translate files sequentially
      for (let i = 0; i < subtitles.length; i++) {
        setActiveFileIndex(i);

        // Update status to translating
        setFileProgresses(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'translating' as const, startTime: Date.now() } : p
        ));

        try {
          const translated = await translateSubtitle(subtitles[i], {
            provider,
            source: sourceLanguage,
            target: targetLanguage,
            options: { concurrency: batcherConfig.concurrency, retries: 3, timeout: 60000 },
            batcherConfig: {
              ...batcherConfig,
              debug: debugMode,
              glossary: parseGlossary(glossaryText),
            },
            temperature: temperature,
            subtitleMode: subtitleMode,
            onProgress: (progress) => {
              setFileProgresses(prev => prev.map((p, idx) =>
                idx === i ? { ...p, current: progress.current, total: progress.total } : p
              ));
            },
            onBatchComplete: (batch: TranslationBatch) => {
              setFileBatches(prev => ({
                ...prev,
                [i]: [...(prev[i] || []), batch]
              }));
              // Save to session for checkpoint/resume
              addCompletedBatch(i, batch);
            },
          });

          translatedSubtitles.push(translated);

          // Update status to completed
          setFileProgresses(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'completed' as const, endTime: Date.now() } : p
          ));
        } catch (fileError) {
          // Update status to error
          setFileProgresses(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error' as const, error: (fileError as Error).message } : p
          ));
        }
      }

      setResults(translatedSubtitles);

      // Clear session if all files completed successfully
      if (translatedSubtitles.length === subtitles.length) {
        clearSession();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsTranslating(false);
    }
  }, [subtitles, files, providerId, providerConfig, sourceLanguage, targetLanguage, debugMode, batcherConfig, temperature, subtitleMode]);

  // Download results
  const handleDownload = useCallback(() => {
    results.forEach((subtitle, index) => {
      const originalFile = files[index];
      const format = detectFormat(originalFile.name);
      if (!format) return;

      const parser = getParser(format);
      const content = parser.serialize(subtitle);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = originalFile.name.replace(/(\.[^.]+)$/, `_${targetLanguage}$1`);
      link.click();
      URL.revokeObjectURL(url);
    });
  }, [results, files, targetLanguage]);

  // Handle session recovery
  const handleRecoverSession = useCallback(async () => {
    if (!pendingSession) return;

    // Restore state from session
    setFileBatches(pendingSession.completedBatches);
    setFileProgresses(pendingSession.fileProgresses);

    // Find first incomplete file
    const resumeIndex = pendingSession.fileProgresses.findIndex(
      fp => fp.status === 'pending' || fp.status === 'translating'
    );
    setActiveFileIndex(resumeIndex >= 0 ? resumeIndex : 0);

    // Parse stored files back into subtitles
    const parsed: Subtitle[] = [];
    for (const storedFile of pendingSession.files) {
      const format = detectFormat(storedFile.name);
      if (!format) continue;
      const parser = getParser(format);
      parsed.push(parser.parse(storedFile.content));
    }
    setSubtitles(parsed);

    // Restore config
    setSourceLanguage(pendingSession.config.sourceLanguage);
    setTargetLanguage(pendingSession.config.targetLanguage);
    setProviderId(pendingSession.config.providerId);
    setSubtitleMode(pendingSession.config.subtitleMode);

    // Close dialog
    setPendingSession(null);

    // Note: User needs to click translate to continue from where they left off
  }, [pendingSession, setSourceLanguage, setTargetLanguage, setProviderId, setSubtitleMode]);

  // Handle discard session
  const handleDiscardSession = useCallback(() => {
    clearSession();
    setPendingSession(null);
  }, []);

  if (!mounted) {
    return null;
  }

  // Get live lines for active file
  const activeBatches = fileBatches[activeFileIndex] || [];
  const liveLines = activeBatches.flatMap(batch =>
    batch.lines.map((line, i) => ({
      original: line.text,
      translated: batch.translations?.[i] || '...',
    }))
  );

  const totalLines = subtitles.reduce((sum, s) => sum + s.lines.length, 0);
  const completedFiles = fileProgresses.filter(p => p.status === 'completed').length;
  const currentProgress = fileProgresses[activeFileIndex];

  return (
    <div className="gradient-bg">
      {/* Session Recovery Dialog */}
      {pendingSession && (
        <SessionRecoveryDialog
          session={pendingSession}
          onRecover={handleRecoverSession}
          onDiscard={handleDiscardSession}
        />
      )}

      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                SubPilot
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <LanguageSwitcher />
              <a
                href="https://github.com/sumulige/subpilot"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t('common.github')}
              </a>
            </div>
          </div>
        </header>

        {/* Main Content - Split Layout */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-2 gap-6 min-h-[calc(100vh-120px)]">

            {/* Left Panel - Controls */}
            <div className="space-y-4">
              {/* File Upload */}
              <div className="glass rounded-xl p-5">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">📂 {t('common.upload')}</h2>
                <FileUploader onFilesSelected={handleFilesSelected} />
                {files.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {t('common.uploadHint', { count: files.length, lines: totalLines })}
                  </div>
                )}
              </div>

              {/* Provider & Language */}
              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">⚙️ {t('common.settings')}</h2>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={subtitleMode === 'bilingual'}
                      onCheckedChange={(checked) => setSubtitleMode(checked ? 'bilingual' : 'translate_only')}
                    />
                    <span className="text-xs text-muted-foreground">
                      {subtitleMode === 'bilingual' ? t('settings.bilingual') : t('settings.targetOnly')}
                    </span>
                  </div>
                </div>

                <ProviderSelector value={providerId} onChange={setProviderId} />
                <ProviderConfigForm
                  providerId={providerId}
                  config={providerConfig}
                  onChange={setProviderConfig}
                />

                <div className="grid grid-cols-2 gap-3">
                  <LanguageSelector
                    label={t('settings.sourceLang')}
                    value={sourceLanguage}
                    onChange={setSourceLanguage}
                    showAuto
                  />
                  <LanguageSelector
                    label={t('settings.targetLang')}
                    value={targetLanguage}
                    onChange={setTargetLanguage}
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="glass rounded-xl p-4 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                    <span>🔧 {t('common.advanced')}</span>
                    <span className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="glass rounded-xl p-5 mt-2">
                  <AdvancedSettings
                    config={batcherConfig}
                    onConfigChange={setBatcherConfig}
                    temperature={temperature}
                    onTemperatureChange={setTemperature}
                    qualityEvalEnabled={qualityEvalEnabled}
                    onQualityEvalChange={setQualityEvalEnabled}
                    debugMode={debugMode}
                    glossaryText={glossaryText}
                    onGlossaryTextChange={setGlossaryText}
                  />
                  <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-white/10">
                    <Switch
                      id="debug-mode"
                      checked={debugMode}
                      onCheckedChange={setDebugMode}
                    />
                    <Label htmlFor="debug-mode" className="text-sm">{t('advanced.debugMode')}</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons & Progress */}
              <div className="glass rounded-xl p-5">
                {error && (
                  <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Multi-File Progress Display */}
                {fileProgresses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {fileProgresses.map((fp, idx) => (
                      <div
                        key={fp.fileIndex}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${idx === activeFileIndex ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white/5'
                          }`}
                        onClick={() => setActiveFileIndex(idx)}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate max-w-[200px]">{fp.fileName}</span>
                          <span className={`${fp.status === 'completed' ? 'text-green-400' :
                            fp.status === 'error' ? 'text-red-400' :
                              fp.status === 'translating' ? 'text-indigo-400' : 'text-muted-foreground'
                            }`}>
                            {fp.status === 'completed' && t('status.completed')}
                            {fp.status === 'error' && t('status.error')}
                            {fp.status === 'translating' && `● ${t('status.translating')}`}
                            {fp.status === 'pending' && `○ ${t('status.pending')}`}
                          </span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${fp.status === 'completed' ? 'bg-green-500' :
                              fp.status === 'error' ? 'bg-red-500' :
                                'bg-gradient-to-r from-indigo-500 to-purple-500'
                              }`}
                            style={{ width: `${fp.total > 0 ? (fp.current / fp.total) * 100 : 0}%` }}
                          />
                        </div>
                        {fp.status === 'translating' && fp.total > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {fp.current}/{fp.total} ({Math.round((fp.current / fp.total) * 100)}%)
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Overall Summary */}
                    {isTranslating && (
                      <div className="text-center text-xs text-muted-foreground pt-2">
                        {t('status.fileProgress', { completed: completedFiles, total: fileProgresses.length })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleTranslate}
                    disabled={isTranslating || files.length === 0}
                    className={`flex-1 ${isTranslating ? '' : 'glow-primary'}`}
                  >
                    {isTranslating ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {t('common.translating')}
                      </span>
                    ) : (
                      t('common.start')
                    )}
                  </Button>

                  {results.length > 0 && (
                    <Button variant="outline" onClick={handleDownload} className="glow-success">
                      📥 {t('common.download')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="glass-strong rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  📝 {t('status.livePreview')} {currentProgress?.fileName ? `- ${currentProgress.fileName}` : ''}
                </h2>
                {isTranslating && (
                  <span className="text-xs text-indigo-400 animate-pulse-glow">
                    {t('status.livePreviewTranslating')}
                  </span>
                )}
                {!isTranslating && liveLines.length > 0 && (
                  <span className="text-xs text-green-400">
                    {t('status.livePreviewComplete', { lines: liveLines.length })}
                  </span>
                )}
              </div>

              <div className="flex-1" style={{ minHeight: 'calc(100vh - 320px)' }}>
                <VirtualTranslationList
                  lines={liveLines}
                  height={Math.max(400, typeof window !== 'undefined' ? window.innerHeight - 350 : 500)}
                  isTranslating={isTranslating}
                  onEditLine={(index, newTranslation) => {
                    // Find which batch and position this line belongs to
                    const batches = fileBatches[activeFileIndex] || [];
                    let lineCount = 0;
                    let targetBatchIdx = -1;
                    let targetPosInBatch = -1;

                    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
                      const batch = batches[batchIdx];
                      const batchSize = batch.lines.length;
                      if (index < lineCount + batchSize) {
                        targetBatchIdx = batchIdx;
                        targetPosInBatch = index - lineCount;
                        break;
                      }
                      lineCount += batchSize;
                    }

                    if (targetBatchIdx >= 0 && targetPosInBatch >= 0) {
                      setFileBatches(prev => ({
                        ...prev,
                        [activeFileIndex]: prev[activeFileIndex]?.map((b, i) =>
                          i === targetBatchIdx
                            ? { ...b, translations: b.translations?.map((t, j) => j === targetPosInBatch ? newTranslation : t) }
                            : b
                        ) || [],
                      }));
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-sm text-muted-foreground">
          © 2026{' '}
          <a
            href="https://github.com/sumulige/subpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            SubPilot
          </a>
          {' '}• by{' '}
          <a
            href="https://gengnuo-1257145452.cos.ap-beijing.myqcloud.com/uPic/2024-11-21/14:10:19-InQEtF.png"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            sumulige
          </a>
        </footer>
      </div >
    </div >
  );
}
