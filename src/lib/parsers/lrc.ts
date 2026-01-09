/**
 * LRC Parser
 * 歌词文件格式解析
 */

import type { Parser, Subtitle, SubtitleLine } from '../types';

/** 时间码解析：[mm:ss.xx] -> 毫秒 */
function parseTimecode(tc: string): number {
    const match = tc.match(/(\d+):(\d+)(?:[.:](\d+))?/);
    if (!match) return 0;
    const [, m, s, ms] = match;
    return (
        parseInt(m) * 60000 +
        parseInt(s) * 1000 +
        parseInt((ms || '0').padEnd(3, '0').slice(0, 3))
    );
}

/** 毫秒 -> 时间码 */
function formatTimecode(ms: number): string {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msec = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msec).padStart(2, '0')}`;
}

export const lrcParser: Parser = {
    parse(content: string): Subtitle {
        const lines: SubtitleLine[] = [];
        const normalized = content.replace(/\r\n?/g, '\n').trim();
        const metadata: Record<string, string> = {};

        let idx = 0;
        for (const line of normalized.split('\n')) {
            // 元数据标签 [ti:Title]
            const metaMatch = line.match(/^\[(\w+):(.+)\]$/);
            if (metaMatch) {
                metadata[metaMatch[1]] = metaMatch[2].trim();
                continue;
            }

            // 时间标签 [00:01.23]歌词
            const lrcMatch = line.match(/^\[(\d+:\d+(?:[.:]\d+)?)\](.*)$/);
            if (lrcMatch) {
                const start = parseTimecode(lrcMatch[1]);
                const text = lrcMatch[2].trim();
                if (text) {
                    idx++;
                    lines.push({ index: idx, start, end: start, text });
                }
            }
        }

        // 计算 end 时间（下一行的 start）
        for (let i = 0; i < lines.length - 1; i++) {
            lines[i].end = lines[i + 1].start;
        }
        if (lines.length > 0) {
            lines[lines.length - 1].end = lines[lines.length - 1].start + 5000;
        }

        return { format: 'lrc', lines, metadata };
    },

    serialize(subtitle: Subtitle): string {
        const metaLines = Object.entries(subtitle.metadata || {}).map(
            ([key, value]) => `[${key}:${value}]`
        );
        const lyricLines = subtitle.lines.map((line) => {
            const tc = formatTimecode(line.start);
            const text = line.translated || line.text;
            return `[${tc}]${text}`;
        });
        return [...metaLines, ...lyricLines].join('\n');
    },
};
