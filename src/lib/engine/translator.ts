/**
 * Batch Translator
 * 批量翻译引擎（重构版）
 */

import type { Provider, BatchOptions, TranslationProgress, Subtitle, SubtitleLine } from '../types';
import { translateWithBatching, type BatcherConfig, type TranslationBatch } from './batcher';
import { TranslationError, ErrorType } from './errors';

// ============================================================================
// Options
// ============================================================================

export interface TranslateOptions {
    provider: Provider;
    source: string;
    target: string;
    options: BatchOptions;
    batcherConfig?: Partial<BatcherConfig>;
    onProgress?: (progress: TranslationProgress) => void;
    onBatchComplete?: (batch: TranslationBatch) => void;
    signal?: AbortSignal;
    temperature?: number;
    subtitleMode?: 'translate_only' | 'bilingual';
}

// ============================================================================
// Single Subtitle Translation
// ============================================================================

/** 翻译单个字幕文件 */
export async function translateSubtitle(
    subtitle: Subtitle,
    opts: TranslateOptions
): Promise<Subtitle> {
    const { provider, source, target, options, batcherConfig, onProgress, signal } = opts;

    // 检查取消
    if (signal?.aborted) {
        throw new TranslationError('Translation cancelled', ErrorType.CANCELLED);
    }

    // 使用智能批量翻译
    const translatedLines = await translateWithBatching(subtitle.lines, {
        provider,
        source,
        target,
        config: {
            concurrency: options.concurrency,
            maxRetries: options.retries,
            ...batcherConfig,
        },
        temperature: opts.temperature,
        subtitleMode: opts.subtitleMode,
        onProgress,
        onBatchComplete: opts.onBatchComplete,
        signal,
    });

    // 双语处理 (Bilingual Post-processing)
    // 如果是双语模式，将原文合并到译文中
    // Batcher 只负责返回 translated 字段，这里处理格式
    const finalLines = translatedLines.map(line => {
        if (!line.translated) return line;

        if (opts.subtitleMode === 'bilingual') {
            // 默认格式：原文 \n 译文
            // 注意：有些用户喜欢 译文 \n 原文，这里先固定为 原文 \n 译文
            return {
                ...line,
                translated: `${line.text}\n${line.translated}`
            };
        }
        return line;
    });

    return {
        ...subtitle,
        lines: finalLines,
    };
}

// ============================================================================
// Batch Subtitle Translation (Multiple Files)
// ============================================================================

/** 批量翻译多个字幕文件 */
export async function translateBatch(
    subtitles: Subtitle[],
    opts: TranslateOptions
): Promise<Subtitle[]> {
    const results: Subtitle[] = [];
    let totalLines = 0;
    let completedLines = 0;

    // 计算总行数
    for (const sub of subtitles) {
        totalLines += sub.lines.length;
    }

    for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];
        const fileStart = completedLines;

        // 检查取消
        if (opts.signal?.aborted) {
            throw new TranslationError('Translation cancelled', ErrorType.CANCELLED);
        }

        const translated = await translateSubtitle(subtitle, {
            ...opts,
            onProgress: (progress) => {
                opts.onProgress?.({
                    current: fileStart + progress.current,
                    total: totalLines,
                    file: `File ${i + 1}/${subtitles.length}`,
                });
            },
        });

        results.push(translated);
        completedLines += subtitle.lines.length;
    }

    return results;
}

// ============================================================================
// Legacy Support (保持向后兼容)
// ============================================================================

/**
 * 简单重试函数（保留给需要简单重试的场景）
 * @deprecated 使用 withRetry from errors.ts
 */
export async function retry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay = 1000
): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e as Error;
            if (i < retries) {
                await new Promise((r) => setTimeout(r, delay * (i + 1)));
            }
        }
    }
    throw lastError;
}
