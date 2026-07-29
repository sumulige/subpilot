/**
 * Job 侧 Ports（S1 只落地 JobStore；其余 S2/S3）
 */

import type { TranslationSession } from '@/lib/engine/translation-session';
import type { FileProgress } from '@/lib/types/file-progress';
import type { TranslationBatch } from '@/lib/engine/batcher';
import type { StoredFile } from '@/lib/engine/translation-session';

export interface JobStorePort {
  load(): TranslationSession | null;
  save(session: TranslationSession): void;
  clear(): void;
  create(
    files: StoredFile[],
    config: TranslationSession['config']
  ): TranslationSession;
  updateFileProgress(fileIndex: number, progress: Partial<FileProgress>): void;
  addCompletedBatch(fileIndex: number, batch: TranslationBatch): void;
  filesToStoredFiles(
    files: File[],
    lineCounts?: number[]
  ): Promise<StoredFile[]>;
  storedFilesToFiles(stored: StoredFile[]): File[];
  hasRecoverable(): boolean;
}
