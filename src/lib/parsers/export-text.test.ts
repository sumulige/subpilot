/**
 * S0: 导出文本组装 — translated 只存纯译文，双语在 serialize 时组装
 */

import { describe, expect, it } from 'vitest';
import { composeExportText } from './export-text';
import { assParser } from './ass';
import { srtParser } from './srt';
import { vttParser } from './vtt';
import type { Subtitle, SubtitleLine } from '../types';

const line = (overrides: Partial<SubtitleLine> = {}): SubtitleLine => ({
    index: 1,
    start: 0,
    end: 1000,
    text: 'Hello',
    translated: '你好',
    ...overrides,
});

describe('composeExportText', () => {
    it('translate_only 返回纯译文', () => {
        expect(composeExportText(line(), 'translate_only')).toBe('你好');
    });

    it('bilingual 组装为 原文\\n译文', () => {
        expect(composeExportText(line(), 'bilingual', '\n')).toBe('Hello\n你好');
    });

    it('无译文时回退原文', () => {
        expect(composeExportText(line({ translated: undefined }), 'bilingual')).toBe('Hello');
    });
});

describe('ASS serialize bilingual（无三重原文）', () => {
    it('bilingual 只出现一次原文', () => {
        const subtitle: Subtitle = {
            format: 'ass',
            lines: [line()],
        };
        const out = assParser.serialize(subtitle, { mode: 'bilingual' });
        const dialogue = out.split('\n').find((l) => l.startsWith('Dialogue:'));
        expect(dialogue).toBeDefined();
        // 期望：Hello\N你好 — 原文只出现一次
        expect(dialogue).toContain('Hello\\N你好');
        expect(dialogue).not.toContain('Hello\\NHello');
    });

    it('translate_only 只有译文', () => {
        const subtitle: Subtitle = { format: 'ass', lines: [line()] };
        const out = assParser.serialize(subtitle, { mode: 'translate_only' });
        const dialogue = out.split('\n').find((l) => l.startsWith('Dialogue:'));
        expect(dialogue).toContain(',,你好');
        expect(dialogue).not.toContain('Hello\\N');
    });
});

describe('SRT/VTT serialize mode', () => {
    it('SRT bilingual 含原文与译文', () => {
        const subtitle: Subtitle = { format: 'srt', lines: [line()] };
        const out = srtParser.serialize(subtitle, { mode: 'bilingual' });
        expect(out).toContain('Hello\n你好');
    });

    it('VTT translate_only 不含原文行', () => {
        const subtitle: Subtitle = { format: 'vtt', lines: [line()] };
        const out = vttParser.serialize(subtitle, { mode: 'translate_only' });
        expect(out).toContain('你好');
        // 不应再强制拼原文
        expect(out).not.toMatch(/Hello\n你好/);
    });
});
