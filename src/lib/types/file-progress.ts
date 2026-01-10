/**
 * File Progress Types
 * 多文件翻译进度状态
 */

export interface FileProgress {
    /** 文件索引 */
    fileIndex: number;
    /** 文件名 */
    fileName: string;
    /** 翻译状态 */
    status: 'pending' | 'translating' | 'completed' | 'error';
    /** 当前完成行数 */
    current: number;
    /** 总行数 */
    total: number;
    /** 开始时间 */
    startTime?: number;
    /** 结束时间 */
    endTime?: number;
    /** 错误信息 */
    error?: string;
}

export interface MultiFileTranslationState {
    /** 所有文件的进度 */
    fileProgresses: FileProgress[];
    /** 当前活动文件索引 */
    activeFileIndex: number;
    /** 每个文件的实时批次 */
    fileBatches: Record<number, import('@/lib/engine/batcher').TranslationBatch[]>;
}

/**
 * 初始化文件进度
 */
export function initFileProgresses(files: File[], subtitles: import('@/lib/types').Subtitle[]): FileProgress[] {
    return files.map((file, index) => ({
        fileIndex: index,
        fileName: file.name,
        status: 'pending' as const,
        current: 0,
        total: subtitles[index]?.lines.length || 0,
    }));
}
