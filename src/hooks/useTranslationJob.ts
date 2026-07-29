'use client';

/**
 * React 桥：订阅 JobService 快照
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TranslationJobService,
  type JobRunConfig,
  type JobSnapshot,
} from '@/lib/job';

export function useTranslationJob() {
  const serviceRef = useRef<TranslationJobService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new TranslationJobService();
  }
  const service = serviceRef.current;

  const [snap, setSnap] = useState<JobSnapshot>(() => service.getSnapshot());

  useEffect(() => {
    const unsub = service.subscribe(setSnap);
    service.hydratePendingRecovery();
    setSnap(service.getSnapshot());
    return unsub;
  }, [service]);

  const loadFiles = useCallback(
    (files: File[]) => service.loadFiles(files),
    [service]
  );

  const start = useCallback(
    (config: JobRunConfig) => service.start(config),
    [service]
  );

  const recoverAndStart = useCallback(
    (config: JobRunConfig) => service.recoverAndStart(config),
    [service]
  );

  const discardRecovery = useCallback(
    () => service.discardRecovery(),
    [service]
  );

  const cancel = useCallback(() => service.cancel(), [service]);

  const editCue = useCallback(
    (lineIndex: number, text: string) => service.editCue(lineIndex, text),
    [service]
  );

  const setActiveFileIndex = useCallback(
    (index: number) => service.setActiveFileIndex(index),
    [service]
  );

  const downloadAll = useCallback(
    (mode: JobRunConfig['subtitleMode'], targetLanguage: string) =>
      service.downloadAll(mode, targetLanguage),
    [service]
  );

  const isTranslating = snap.status === 'running' || snap.status === 'preparing';

  const liveLines = useMemo(() => {
    const resultLines = snap.results[snap.activeFileIndex]?.lines;
    const activeBatches = snap.fileBatches[snap.activeFileIndex] || [];
    if (resultLines && resultLines.some((l) => l.translated != null)) {
      return resultLines.map((line) => ({
        original: line.text,
        translated: line.translated || (isTranslating ? '...' : ''),
      }));
    }
    return activeBatches.flatMap((batch) =>
      batch.lines.map((line, i) => ({
        original: line.text,
        translated: batch.translations?.[i] || '...',
      }))
    );
  }, [snap.results, snap.fileBatches, snap.activeFileIndex, isTranslating]);

  return {
    ...snap,
    isTranslating,
    liveLines,
    loadFiles,
    start,
    recoverAndStart,
    discardRecovery,
    cancel,
    editCue,
    setActiveFileIndex,
    downloadAll,
  };
}
