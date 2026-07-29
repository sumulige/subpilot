/**
 * 导出文本组装
 * translated 字段始终只存纯译文；双语在导出时按 mode 组装
 */

import type { SubtitleLine, SubtitleMode } from '../types';

/**
 * 按导出模式组装单行显示文本
 * @param separator 行内换行符（SRT/VTT 用 \\n，ASS 先用 \\n 再统一转 \\N）
 */
export function composeExportText(
    line: SubtitleLine,
    mode: SubtitleMode = 'translate_only',
    separator = '\n'
): string {
    const translated = line.translated;
    if (translated == null || translated === '') {
        return line.text;
    }

    if (mode === 'bilingual') {
        return `${line.text}${separator}${translated}`;
    }

    return translated;
}
