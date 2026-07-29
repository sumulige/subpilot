/**
 * Smart Batcher — 编排入口
 * 分片 / 限速 / 执行已拆到 partition · rate-limit · execute-batch
 */

import type { SubtitleLine } from '../types';
import { TranslationError, ErrorType } from './errors';
import { createLogger, LogLevel } from '../logger';
import { getEffectiveConfig } from './batch-config';
import { createBatches, fillBatchContext } from './partition';
import { createLimiter, createRateLimiter } from './rate-limit';
import {
  translateBatch,
  type BatchTranslateOptions,
} from './execute-batch';
import type { TranslationBatch } from './batch-config';

// 兼容旧 import 路径：全部从 batcher 再导出
export {
  type BatcherConfig,
  type TranslationBatch,
  DEFAULT_CONFIG,
  SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT,
  getEffectiveConfig,
} from './batch-config';
export { createBatches, fillBatchContext } from './partition';
export { createLimiter, createRateLimiter } from './rate-limit';
export {
  translateBatch,
  splitTranslation,
  type BatchTranslateOptions,
} from './execute-batch';

/**
 * 批量翻译所有字幕行
 */
export async function translateWithBatching(
  lines: SubtitleLine[],
  options: BatchTranslateOptions
): Promise<SubtitleLine[]> {
  const totalStartTime = Date.now();

  const config = getEffectiveConfig(options.provider.id, options.config);

  const log = createLogger('Batcher');
  if (config.debug) log.setLevel(LogLevel.DEBUG);

  log.info(`🚀 开始批量翻译，共 ${lines.length} 行`);
  log.info(`📋 Provider: ${options.provider.id}`, {
    concurrency: config.concurrency,
    maxRequestsPerSecond: config.maxRequestsPerSecond,
    maxLinesPerBatch: config.maxLinesPerBatch,
  });

  const nonEmptyLines: { original: SubtitleLine; index: number }[] = [];
  const results: SubtitleLine[] = lines.map((line) => ({ ...line }));
  let skippedTranslated = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].translated != null && lines[i].translated !== '') {
      skippedTranslated++;
      continue;
    }
    if (lines[i].text.trim()) {
      nonEmptyLines.push({ original: lines[i], index: i });
    } else {
      results[i].translated = '';
    }
  }

  if (nonEmptyLines.length === 0) {
    options.onProgress?.({
      current: lines.length,
      total: lines.length,
    });
    return results;
  }

  const batches = createBatches(
    nonEmptyLines.map((n) => n.original),
    config
  );

  let completedLines = skippedTranslated;
  const totalLines = nonEmptyLines.length + skippedTranslated;
  if (skippedTranslated > 0) {
    options.onProgress?.({ current: completedLines, total: totalLines });
  }

  const limit = createLimiter(config.concurrency);
  const rateLimit = createRateLimiter(config.maxRequestsPerSecond);

  const runBatch = async (batch: TranslationBatch) => {
    await rateLimit();
    fillBatchContext(batches, config);
    await translateBatch(batch, options);

    completedLines += batch.lines.length;
    options.onProgress?.({ current: completedLines, total: totalLines });
    options.onBatchComplete?.(batch);
  };

  await Promise.all(
    batches.map((batch) =>
      limit(() =>
        runBatch(batch).catch((e) => {
          if (
            e instanceof TranslationError &&
            e.type === ErrorType.CANCELLED
          ) {
            throw e;
          }
          log.error(`Batch ${batch.index} processing failed:`, e);
        })
      )
    )
  );

  const totalDuration = Date.now() - totalStartTime;
  log.info(
    `🏁 批量翻译完成，总耗时: ${totalDuration}ms，共 ${batches.length} 批次`
  );

  let lineIndex = 0;
  for (const batch of batches) {
    if (batch.translations) {
      for (let i = 0; i < batch.lines.length; i++) {
        const originalIndex = nonEmptyLines[lineIndex].index;
        results[originalIndex].translated = batch.translations[i];
        lineIndex++;
      }
    } else {
      for (let i = 0; i < batch.lines.length; i++) {
        lineIndex++;
      }
    }
  }

  return results;
}
