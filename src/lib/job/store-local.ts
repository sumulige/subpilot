/**
 * JobStorePort：localStorage session 适配器
 */

import {
  createSession,
  saveSession,
  getSession,
  clearSession,
  updateFileProgress,
  addCompletedBatch,
  filesToStoredFiles,
  storedFilesToFiles,
  hasRecoverableSession,
  type TranslationSession,
  type StoredFile,
} from '@/lib/engine/translation-session';
import type { FileProgress } from '@/lib/types/file-progress';
import type { TranslationBatch } from '@/lib/engine/batcher';
import type { JobStorePort } from './ports';

export const localJobStore: JobStorePort = {
  load: getSession,
  save: saveSession,
  clear: clearSession,
  create: createSession,
  updateFileProgress,
  addCompletedBatch,
  filesToStoredFiles,
  storedFilesToFiles,
  hasRecoverable: hasRecoverableSession,
};

export type { TranslationSession, StoredFile, FileProgress, TranslationBatch };
