/**
 * S0: 批次写回 + 跳过已译行
 */

import { describe, expect, it, vi } from 'vitest';
import { applyBatchesToSubtitle } from './apply-batches';
import { translateWithBatching, type TranslationBatch } from './batcher';
import type { Provider, Subtitle, SubtitleLine } from '../types';

function makeLine(index: number, text: string, translated?: string): SubtitleLine {
    return {
        index,
        start: index * 1000,
        end: index * 1000 + 900,
        text,
        translated,
    };
}

describe('applyBatchesToSubtitle', () => {
    it('按 index 写回纯译文', () => {
        const subtitle: Subtitle = {
            format: 'srt',
            lines: [makeLine(1, 'A'), makeLine(2, 'B')],
        };
        const batches: TranslationBatch[] = [
            {
                index: 0,
                lines: [makeLine(1, 'A'), makeLine(2, 'B')],
                mergedText: 'A\n%%\nB',
                context: { before: '', after: '' },
                status: 'completed',
                translations: ['甲', '乙'],
            },
        ];
        const out = applyBatchesToSubtitle(subtitle, batches);
        expect(out.lines[0].translated).toBe('甲');
        expect(out.lines[1].translated).toBe('乙');
        // 不组装双语
        expect(out.lines[0].translated).not.toContain('A\n');
    });
});

describe('translateWithBatching skip already translated', () => {
    it('已有译文的行保留原译，仅翻译剩余行', async () => {
        const translate = vi.fn(async () => ({ text: '新译' }));
        const provider: Provider = {
            id: 'mock',
            name: 'Mock',
            type: 'llm',
            translate,
        };

        const lines = [
            makeLine(1, 'Hello', '你好'),
            makeLine(2, 'World'),
        ];

        const result = await translateWithBatching(lines, {
            provider,
            source: 'en',
            target: 'zh',
            config: {
                concurrency: 1,
                maxLinesPerBatch: 10,
                maxCharsPerBatch: 3000,
                maxRetries: 0,
                debug: false,
            },
        });

        expect(result[0].translated).toBe('你好');
        expect(translate).toHaveBeenCalledTimes(1);
        expect(result[1].translated).toBe('新译');
    });
});
