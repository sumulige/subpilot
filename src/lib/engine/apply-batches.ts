/**
 * 将已完成批次写回字幕行（纯译文，不组装双语）
 */

import type { Subtitle, SubtitleLine } from '../types';
import type { TranslationBatch } from './batcher';

/** 用批次中的 translations 填充 subtitle.lines[].translated */
export function applyBatchesToSubtitle(
    subtitle: Subtitle,
    batches: TranslationBatch[]
): Subtitle {
    const lines: SubtitleLine[] = subtitle.lines.map((line) => ({ ...line }));

    for (const batch of batches) {
        if (!batch.translations || batch.status === 'failed') continue;

        for (let i = 0; i < batch.lines.length; i++) {
            const sourceLine = batch.lines[i];
            const translation = batch.translations[i];
            if (translation == null) continue;

            // 优先按 index + start 匹配，避免多文件混淆
            let targetIdx = lines.findIndex(
                (l) => l.index === sourceLine.index && l.start === sourceLine.start
            );
            if (targetIdx < 0) {
                targetIdx = lines.findIndex((l) => l.index === sourceLine.index);
            }
            if (targetIdx < 0) continue;

            lines[targetIdx] = {
                ...lines[targetIdx],
                translated: translation,
            };
        }
    }

    return { ...subtitle, lines };
}

/** 统计批次已覆盖的行数 */
export function countBatchLines(batches: TranslationBatch[]): number {
    return batches.reduce((sum, b) => sum + (b.lines?.length ?? 0), 0);
}
