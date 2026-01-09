/**
 * VTT Parser
 * WebVTT 字幕格式解析
 */

import type { Parser, Subtitle, SubtitleLine } from '../types';

/** 时间码解析：00:01:23.456 -> 毫秒 */
function parseTimecode(tc: string): number {
    // VTT 支持 mm:ss.ms 或 hh:mm:ss.ms
    const parts = tc.split(':');
    let h = 0, m = 0, s = 0, ms = 0;

    if (parts.length === 3) {
        h = parseInt(parts[0]);
        m = parseInt(parts[1]);
        const [sec, msec] = parts[2].split('.');
        s = parseInt(sec);
        ms = parseInt((msec || '0').padEnd(3, '0'));
    } else if (parts.length === 2) {
        m = parseInt(parts[0]);
        const [sec, msec] = parts[1].split('.');
        s = parseInt(sec);
        ms = parseInt((msec || '0').padEnd(3, '0'));
    }

    return h * 3600000 + m * 60000 + s * 1000 + ms;
}

/** 毫秒 -> 时间码 */
function formatTimecode(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msec = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msec).padStart(3, '0')}`;
}

export const vttParser: Parser = {
    parse(content: string): Subtitle {
        const lines: SubtitleLine[] = [];
        const normalized = content.replace(/\r\n?/g, '\n').trim();

        // 移除 WEBVTT 头
        const blocks = normalized.split(/\n\n+/).filter((b) => !b.startsWith('WEBVTT'));

        let idx = 0;
        for (const block of blocks) {
            const blockLines = block.split('\n');
            if (blockLines.length < 1) continue;

            // 查找时间码行
            let timeLineIdx = 0;
            for (let i = 0; i < blockLines.length; i++) {
                if (blockLines[i].includes('-->')) {
                    timeLineIdx = i;
                    break;
                }
            }

            const timeLine = blockLines[timeLineIdx];
            const timeMatch = timeLine.match(/(.+?)\s*-->\s*(.+?)(?:\s|$)/);
            if (!timeMatch) continue;

            const start = parseTimecode(timeMatch[1].trim());
            const end = parseTimecode(timeMatch[2].trim());
            const text = blockLines.slice(timeLineIdx + 1).join('\n');

            idx++;
            lines.push({ index: idx, start, end, text });
        }

        return { format: 'vtt', lines };
    },

    serialize(subtitle: Subtitle): string {
        const header = 'WEBVTT\n\n';
        const body = subtitle.lines
            .map((line) => {
                const start = formatTimecode(line.start);
                const end = formatTimecode(line.end);
                const text = line.translated
                    ? `${line.text}\n${line.translated}`
                    : line.text;
                return `${start} --> ${end}\n${text}`;
            })
            .join('\n\n');
        return header + body;
    },
};
