/**
 * TranslationJobService — 唯一编排入口
 * UI 只通过本服务读写 Job，不直接碰 batcher / session
 */

import { registry } from '@/lib/providers';
import { getParser, detectFormat } from '@/lib/parsers';
import { translateSubtitle, applyBatchesToSubtitle } from '@/lib/engine';
import { parseGlossary } from '@/lib/engine/glossary';
import type { TranslationBatch } from '@/lib/engine/batcher';
import type { TranslationSession } from '@/lib/engine/translation-session';
import type { Subtitle } from '@/lib/types';
import { initFileProgresses } from '@/lib/types/file-progress';
import type { JobStorePort } from './ports';
import { localJobStore } from './store-local';
import { tryTransition } from './state-machine';
import {
  emptySnapshot,
  type JobRunConfig,
  type JobSnapshot,
  type JobStatus,
} from './types';

type Listener = (snap: JobSnapshot) => void;

export class TranslationJobService {
  private snap: JobSnapshot = emptySnapshot();
  private listeners = new Set<Listener>();
  private abort: AbortController | null = null;
  private session: TranslationSession | null = null;

  constructor(private readonly store: JobStorePort = localJobStore) {}

  getSnapshot(): JobSnapshot {
    return this.snap;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<JobSnapshot> & { status?: JobStatus }) {
    if (
      patch.status !== undefined &&
      patch.status !== this.snap.status &&
      !tryTransition(this.snap.status, patch.status)
    ) {
      console.warn(
        `[JobService] ignore transition ${this.snap.status} → ${patch.status}`
      );
      const { status: _s, ...rest } = patch;
      this.snap = { ...this.snap, ...rest };
      this.listeners.forEach((l) => l(this.snap));
      return;
    }
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l(this.snap));
  }

  private setStatus(status: JobStatus, extra?: Partial<JobSnapshot>) {
    this.emit({ ...extra, status });
  }

  /** 挂载时扫描可恢复会话 */
  hydratePendingRecovery(): void {
    if (!this.store.hasRecoverable()) return;
    const session = this.store.load();
    if (!session) return;
    this.emit({ pendingRecovery: session });
  }

  /** 上传并解析文件 → idle 文档就绪 */
  async loadFiles(selectedFiles: File[]): Promise<void> {
    this.abort?.abort();
    this.abort = null;
    this.session = null;
    this.store.clear();

    const parsed: Subtitle[] = [];
    for (const file of selectedFiles) {
      const format = detectFormat(file.name);
      if (!format) continue;
      const text = await file.text();
      parsed.push(getParser(format).parse(text));
    }

    this.setStatus('idle', {
      files: selectedFiles,
      subtitles: parsed,
      results: [],
      fileBatches: {},
      fileProgresses: [],
      activeFileIndex: 0,
      error: null,
      pendingRecovery: null,
    });
  }

  setActiveFileIndex(index: number): void {
    this.emit({ activeFileIndex: index });
  }

  /**
   * 编辑单行译文：results 为 SoT，同步回写对应 batch（若有）
   */
  editCue(lineIndex: number, newTranslation: string): void {
    const { activeFileIndex, results, fileBatches } = this.snap;
    const current = results[activeFileIndex];
    if (!current) return;

    const nextResults = [...results];
    nextResults[activeFileIndex] = {
      ...current,
      lines: current.lines.map((line, i) =>
        i === lineIndex ? { ...line, translated: newTranslation } : line
      ),
    };

    const batches = fileBatches[activeFileIndex] || [];
    let lineCount = 0;
    let targetBatchIdx = -1;
    let targetPosInBatch = -1;
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batchSize = batches[batchIdx].lines.length;
      if (lineIndex < lineCount + batchSize) {
        targetBatchIdx = batchIdx;
        targetPosInBatch = lineIndex - lineCount;
        break;
      }
      lineCount += batchSize;
    }

    let nextBatches = fileBatches;
    if (targetBatchIdx >= 0 && targetPosInBatch >= 0) {
      nextBatches = {
        ...fileBatches,
        [activeFileIndex]:
          fileBatches[activeFileIndex]?.map((b, i) =>
            i === targetBatchIdx
              ? {
                  ...b,
                  translations: b.translations?.map((tr, j) =>
                    j === targetPosInBatch ? newTranslation : tr
                  ),
                }
              : b
          ) || [],
      };
    }

    this.emit({ results: nextResults, fileBatches: nextBatches });
  }

  /** 放弃恢复 */
  discardRecovery(): void {
    this.store.clear();
    this.emit({ pendingRecovery: null });
  }

  /** 恢复并立即续跑 */
  async recoverAndStart(config: JobRunConfig): Promise<void> {
    const pending = this.snap.pendingRecovery;
    if (!pending) return;

    const restoredFiles = this.store.storedFilesToFiles(pending.files);
    const parsed: Subtitle[] = [];
    for (const storedFile of pending.files) {
      const format = detectFormat(storedFile.name);
      if (!format) continue;
      parsed.push(getParser(format).parse(storedFile.content));
    }

    const resumeIndex = pending.fileProgresses.findIndex(
      (fp) => fp.status === 'pending' || fp.status === 'translating'
    );

    this.snap = {
      ...this.snap,
      status: 'idle',
      files: restoredFiles,
      subtitles: parsed,
      fileBatches: pending.completedBatches,
      fileProgresses: pending.fileProgresses,
      activeFileIndex: resumeIndex >= 0 ? resumeIndex : 0,
      pendingRecovery: null,
      error: null,
    };
    this.listeners.forEach((l) => l(this.snap));

    await this.start(config, pending);
  }

  cancel(): void {
    this.abort?.abort();
    this.abort = null;
    if (this.snap.status === 'running' || this.snap.status === 'preparing') {
      const fileProgresses = this.snap.fileProgresses.map((p) =>
        p.status === 'translating'
          ? { ...p, status: 'pending' as const }
          : p
      );
      if (this.session) {
        this.session.fileProgresses = fileProgresses;
        this.session.completedBatches = { ...this.snap.fileBatches };
        this.store.save(this.session);
      }
      this.setStatus('paused', { fileProgresses });
    }
  }

  /** 从当前内存快照构造可续跑 session（错误/中断文件 → pending） */
  private snapshotAsResumeSession(): TranslationSession | null {
    if (!this.session) return null;
    return {
      ...this.session,
      completedBatches: { ...this.snap.fileBatches },
      fileProgresses: this.snap.fileProgresses.map((p) => {
        if (p.status === 'translating' || p.status === 'error') {
          return { ...p, status: 'pending' as const, error: undefined };
        }
        return p;
      }),
    };
  }

  /** 开始 / 续跑（paused、failed 自动从检查点继续） */
  async start(
    config: JobRunConfig,
    resumeSession?: TranslationSession | null
  ): Promise<void> {
    const { subtitles: activeSubtitles, files: activeFiles } = this.snap;

    if (activeSubtitles.length === 0) {
      this.emit({ error: '请先上传字幕文件' });
      return;
    }

    if (this.snap.status === 'running' || this.snap.status === 'preparing') {
      return;
    }

    let resume = resumeSession ?? null;
    if (
      !resume &&
      this.session &&
      (this.snap.status === 'paused' || this.snap.status === 'failed')
    ) {
      resume = this.snapshotAsResumeSession();
    }

    this.abort?.abort();
    this.abort = new AbortController();
    const signal = this.abort.signal;

    this.setStatus('preparing', { error: null });

    const provider = registry.get(config.providerId, config.providerConfig);
    const modelId = String(
      config.providerConfig.model ?? config.providerConfig.modelId ?? ''
    );

    const existingBatches: Record<number, TranslationBatch[]> = resume
      ? { ...resume.completedBatches }
      : {};

    if (resume) {
      this.session = {
        ...resume,
        fileProgresses: resume.fileProgresses.map((p) =>
          p.status === 'translating' ? { ...p, status: 'pending' as const } : p
        ),
      };
      const seedResults = activeSubtitles.map((sub, i) =>
        applyBatchesToSubtitle(sub, existingBatches[i] || [])
      );
      this.emit({
        fileBatches: existingBatches,
        fileProgresses: this.session.fileProgresses,
        results: seedResults,
      });
    } else {
      const progresses = initFileProgresses(activeFiles, activeSubtitles);
      const storedFiles = await this.store.filesToStoredFiles(
        activeFiles,
        activeSubtitles.map((s) => s.lines.length)
      );
      this.session = this.store.create(storedFiles, {
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        providerId: config.providerId,
        modelId,
        subtitleMode: config.subtitleMode,
      });
      this.emit({
        results: [],
        fileBatches: {},
        fileProgresses: progresses,
        activeFileIndex: 0,
      });
    }

    this.store.save(this.session!);
    this.setStatus('running');

    const translatedSubtitles: Subtitle[] = activeSubtitles.map((sub, i) =>
      applyBatchesToSubtitle(sub, existingBatches[i] || [])
    );

    try {
      for (let i = 0; i < activeSubtitles.length; i++) {
        if (signal.aborted) {
          this.setStatus('paused');
          return;
        }

        this.emit({ activeFileIndex: i });

        if (this.session!.fileProgresses[i]?.status === 'completed') {
          continue;
        }

        const startTime = Date.now();
        this.patchFileProgress(i, { status: 'translating', startTime });
        this.store.updateFileProgress(i, { status: 'translating', startTime });

        try {
          const inputSubtitle = applyBatchesToSubtitle(
            activeSubtitles[i],
            existingBatches[i] || []
          );

          const translated = await translateSubtitle(inputSubtitle, {
            provider,
            source: config.sourceLanguage,
            target: config.targetLanguage,
            options: {
              concurrency: config.batcherConfig.concurrency,
              retries: 3,
              timeout: 60000,
            },
            batcherConfig: {
              ...config.batcherConfig,
              debug: config.debugMode,
              glossary: parseGlossary(config.glossaryText),
            },
            temperature: config.temperature,
            subtitleMode: config.subtitleMode,
            signal,
            onProgress: (progress) => {
              this.patchFileProgress(i, {
                current: progress.current,
                total: progress.total,
              });
            },
            onBatchComplete: (batch: TranslationBatch) => {
              const prevBatches = this.snap.fileBatches[i] || [];
              const nextFileBatches = {
                ...this.snap.fileBatches,
                [i]: [...prevBatches, batch],
              };
              this.store.addCompletedBatch(i, batch);

              const base =
                this.snap.results[i] ??
                applyBatchesToSubtitle(
                  activeSubtitles[i],
                  existingBatches[i] || []
                );
              const nextResults = [...this.snap.results];
              nextResults[i] = applyBatchesToSubtitle(base, [batch]);

              this.emit({
                fileBatches: nextFileBatches,
                results: nextResults,
              });
            },
          });

          translatedSubtitles[i] = translated;
          const endTime = Date.now();
          const done = {
            status: 'completed' as const,
            endTime,
            current: translated.lines.length,
            total: translated.lines.length,
          };
          this.patchFileProgress(i, done);
          this.store.updateFileProgress(i, done);
          this.session!.fileProgresses[i] = {
            ...this.session!.fileProgresses[i],
            ...done,
          };

          const nextResults = [...this.snap.results];
          nextResults[i] = translated;
          this.emit({ results: nextResults });
        } catch (fileError) {
          if (signal.aborted) {
            this.setStatus('paused');
            return;
          }
          const errMsg = (fileError as Error).message;
          this.patchFileProgress(i, { status: 'error', error: errMsg });
          this.store.updateFileProgress(i, { status: 'error', error: errMsg });
        }
      }

      this.emit({ results: [...translatedSubtitles] });

      const allOk = this.session!.fileProgresses.every(
        (fp) => fp.status === 'completed'
      );
      if (allOk) {
        this.store.clear();
        this.session = null;
        this.setStatus('completed');
      } else {
        // 若已暂停则勿覆盖为 failed
        if (this.snap.status !== 'paused') {
          this.setStatus('failed');
        }
      }
    } catch (e) {
      if (this.snap.status !== 'paused') {
        this.setStatus('failed', { error: (e as Error).message });
      }
    } finally {
      this.abort = null;
    }
  }

  private patchFileProgress(
    index: number,
    patch: Partial<JobSnapshot['fileProgresses'][number]>
  ) {
    const fileProgresses = this.snap.fileProgresses.map((p, idx) =>
      idx === index ? { ...p, ...patch } : p
    );
    if (this.session) {
      this.session.fileProgresses = fileProgresses;
    }
    this.emit({ fileProgresses });
  }

  /** 按当前 results + subtitleMode 下载全部文件 */
  downloadAll(subtitleMode: JobRunConfig['subtitleMode'], targetLanguage: string): void {
    const { results, files } = this.snap;
    results.forEach((subtitle, index) => {
      const originalFile = files[index];
      if (!originalFile) return;
      const format = detectFormat(originalFile.name);
      if (!format) return;

      const content = getParser(format).serialize(subtitle, { mode: subtitleMode });
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalFile.name.replace(
        /(\.[^.]+)$/,
        `_${targetLanguage}$1`
      );
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
