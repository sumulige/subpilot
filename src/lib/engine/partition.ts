/**
 * Partition：字幕行 → 批次 + 上下文填充
 */

import type { SubtitleLine } from '../types';
import {
  DEFAULT_CONFIG,
  type BatcherConfig,
  type TranslationBatch,
} from './batch-config';

/**
 * 将字幕行分组为批次
 */
export function createBatches(
  lines: SubtitleLine[],
  config: Partial<BatcherConfig> = {}
): TranslationBatch[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const batches: TranslationBatch[] = [];

  let currentBatch: SubtitleLine[] = [];
  let currentChars = 0;

  for (const line of lines) {
    const lineChars = line.text.length + cfg.lineSeparator.length;

    const shouldStartNew =
      currentBatch.length >= cfg.maxLinesPerBatch ||
      (currentChars + lineChars > cfg.maxCharsPerBatch &&
        currentBatch.length > 0);

    if (shouldStartNew) {
      batches.push(createBatchFromLines(currentBatch, batches.length, cfg));
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push(line);
    currentChars += lineChars;
  }

  if (currentBatch.length > 0) {
    batches.push(createBatchFromLines(currentBatch, batches.length, cfg));
  }

  return batches;
}

function createBatchFromLines(
  lines: SubtitleLine[],
  index: number,
  config: BatcherConfig
): TranslationBatch {
  const mergedText = lines.map((l) => l.text).join(config.lineSeparator);

  return {
    index,
    lines,
    mergedText,
    context: { before: '', after: '' },
    status: 'pending',
  };
}

/**
 * 为批次填充上下文（前文译文 / 后文原文）
 */
export function fillBatchContext(
  batches: TranslationBatch[],
  config: Partial<BatcherConfig> = {}
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (i > 0) {
      const prevBatch = batches[i - 1];
      if (prevBatch.translations) {
        const contextLines = prevBatch.translations.slice(-cfg.contextLines);
        batch.context.before = contextLines.join('\n');
      } else {
        const contextLines = prevBatch.lines
          .slice(-cfg.contextLines)
          .map((l) => l.text);
        batch.context.before = contextLines.join('\n');
      }
    }

    if (i < batches.length - 1) {
      const nextBatch = batches[i + 1];
      const contextLines = nextBatch.lines
        .slice(0, cfg.contextLines)
        .map((l) => l.text);
      batch.context.after = contextLines.join('\n');
    }
  }
}
