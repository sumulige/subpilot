/**
 * Translation Job 领域类型
 * 聚合根快照：UI 只读此结构，不另写进度/结果
 */

import type { Subtitle, ProviderConfig, SubtitleMode } from '@/lib/types';
import type { FileProgress } from '@/lib/types/file-progress';
import type { TranslationBatch } from '@/lib/engine/batcher';
import type { BatcherConfig } from '@/lib/engine/batcher';
import type { TranslationSession } from '@/lib/engine/translation-session';

/** Job 状态机 */
export type JobStatus =
  | 'idle'
  | 'preparing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

/** 运行时偏好（来自 UI / localStorage） */
export interface JobRunConfig {
  providerId: string;
  providerConfig: ProviderConfig;
  sourceLanguage: string;
  targetLanguage: string;
  subtitleMode: SubtitleMode;
  temperature: number;
  batcherConfig: Partial<BatcherConfig>;
  debugMode: boolean;
  glossaryText: string;
}

/** 对外只读快照 */
export interface JobSnapshot {
  status: JobStatus;
  files: File[];
  subtitles: Subtitle[];
  results: Subtitle[];
  fileProgresses: FileProgress[];
  fileBatches: Record<number, TranslationBatch[]>;
  activeFileIndex: number;
  error: string | null;
  /** 可恢复的检查点（非 null 时显示恢复对话框） */
  pendingRecovery: TranslationSession | null;
}

export function emptySnapshot(): JobSnapshot {
  return {
    status: 'idle',
    files: [],
    subtitles: [],
    results: [],
    fileProgresses: [],
    fileBatches: {},
    activeFileIndex: 0,
    error: null,
    pendingRecovery: null,
  };
}
