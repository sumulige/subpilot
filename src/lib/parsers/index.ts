/**
 * Parsers Entry Point
 * 字幕解析器统一导出
 */

import type { Parser, SubtitleFormat } from '../types';
import { srtParser } from './srt';
import { vttParser } from './vtt';
import { lrcParser } from './lrc';
import { assParser } from './ass';

export { srtParser } from './srt';
export { vttParser } from './vtt';
export { lrcParser } from './lrc';
export { assParser } from './ass';

/** 根据格式获取解析器 */
export function getParser(format: SubtitleFormat): Parser {
    const parsers: Record<SubtitleFormat, Parser> = {
        srt: srtParser,
        vtt: vttParser,
        lrc: lrcParser,
        ass: assParser,
    };
    return parsers[format];
}

/** 根据文件扩展名检测格式 */
export function detectFormat(filename: string): SubtitleFormat | null {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'srt':
            return 'srt';
        case 'vtt':
            return 'vtt';
        case 'lrc':
            return 'lrc';
        case 'ass':
        case 'ssa':
            return 'ass';
        default:
            return null;
    }
}
