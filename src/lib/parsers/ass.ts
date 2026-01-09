/**
 * ASS/SSA Parser
 * Advanced SubStation Alpha 字幕格式解析
 */

import type { Parser, Subtitle, SubtitleLine } from '../types';

/** 时间码解析：0:01:23.45 -> 毫秒 */
function parseTimecode(tc: string): number {
    const match = tc.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (!match) return 0;
    const [, h, m, s, cs] = match;
    return (
        parseInt(h) * 3600000 +
        parseInt(m) * 60000 +
        parseInt(s) * 1000 +
        parseInt(cs) * 10
    );
}

/** 毫秒 -> 时间码 */
function formatTimecode(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** 清理 ASS 标签 */
function cleanAssTags(text: string): string {
    return text
        .replace(/\{[^}]*\}/g, '') // 移除样式标签
        .replace(/\\N/g, '\n')     // 换行符
        .replace(/\\n/g, '\n')
        .replace(/\\h/g, ' ');     // 硬空格
}

export const assParser: Parser = {
    parse(content: string): Subtitle {
        const lines: SubtitleLine[] = [];
        const normalized = content.replace(/\r\n?/g, '\n');
        const metadata: Record<string, string> = {};

        // 找到 [Events] 部分
        const eventsMatch = normalized.match(/\[Events\][^\[]*Format:\s*(.+)/i);
        if (!eventsMatch) return { format: 'ass', lines };

        // 解析 Format 行确定字段顺序
        const format = eventsMatch[1].split(',').map((f) => f.trim().toLowerCase());
        const startIdx = format.indexOf('start');
        const endIdx = format.indexOf('end');
        const textIdx = format.indexOf('text');
        const styleIdx = format.indexOf('style');

        // 找所有 Dialogue 行
        const dialogueRegex = /Dialogue:\s*(.+)/gi;
        let match;
        let idx = 0;

        while ((match = dialogueRegex.exec(normalized)) !== null) {
            // ASS 字段用逗号分隔，但 Text 字段可能包含逗号
            const parts = match[1].split(',');
            if (parts.length < Math.max(startIdx, endIdx, textIdx) + 1) continue;

            const start = parseTimecode(parts[startIdx]);
            const end = parseTimecode(parts[endIdx]);
            // Text 字段是最后一个，可能包含逗号
            const text = cleanAssTags(parts.slice(textIdx).join(','));
            const style = styleIdx >= 0 ? parts[styleIdx] : undefined;

            idx++;
            lines.push({ index: idx, start, end, text, style });
        }

        return { format: 'ass', lines, metadata };
    },

    serialize(subtitle: Subtitle): string {
        // 简化输出，仅保留基本结构
        const header = `[Script Info]
Title: Translated Subtitle
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

        const dialogues = subtitle.lines.map((line) => {
            const start = formatTimecode(line.start);
            const end = formatTimecode(line.end);
            const style = line.style || 'Default';
            const text = line.translated
                ? `${line.text}\\N${line.translated}`
                : line.text;
            return `Dialogue: 0,${start},${end},${style},,0,0,0,,${text.replace(/\n/g, '\\N')}`;
        });

        return `${header}\n${dialogues.join('\n')}`;
    },
};
