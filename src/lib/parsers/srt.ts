/**
 * SRT Parser
 * SubRip 字幕格式解析
 */

import type { Parser, Subtitle, SubtitleLine } from '../types';

/** 时间码解析：00:01:23,456 -> 毫秒 */
function parseTimecode(tc: string): number {
    const match = tc.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
    if (!match) return 0;
    const [, h, m, s, ms] = match;
    return (
        parseInt(h) * 3600000 +
        parseInt(m) * 60000 +
        parseInt(s) * 1000 +
        parseInt(ms.padEnd(3, '0'))
    );
}

/** 毫秒 -> 时间码 */
function formatTimecode(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msec = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msec).padStart(3, '0')}`;
}

export const srtParser: Parser = {
    parse(content: string): Subtitle {
        const lines: SubtitleLine[] = [];
        // 统一换行符
        const normalized = content.replace(/\r\n?/g, '\n').trim();
        // 按空行分割块
        const blocks = normalized.split(/\n\n+/);

        for (const block of blocks) {
            const blockLines = block.split('\n');
            if (blockLines.length < 2) continue;

            // 第一行：序号
            const index = parseInt(blockLines[0].trim());
            if (isNaN(index)) continue;

            // 第二行：时间码
            const timeLine = blockLines[1];
            const timeMatch = timeLine.match(/(.+?)\s*-->\s*(.+)/);
            if (!timeMatch) continue;

            const start = parseTimecode(timeMatch[1].trim());
            const end = parseTimecode(timeMatch[2].trim());

            // 剩余行：文本
            const text = blockLines.slice(2).join('\n');

            lines.push({ index, start, end, text });
        }

        return { format: 'srt', lines };
    },

    serialize(subtitle: Subtitle): string {
        return subtitle.lines
            .map((line, i) => {
                const idx = line.index || i + 1;
                const start = formatTimecode(line.start);
                const end = formatTimecode(line.end);
                const text = line.translated ?? line.text;
                return `${idx}\n${start} --> ${end}\n${text}`;
            })
            .join('\n\n');
    },
};
