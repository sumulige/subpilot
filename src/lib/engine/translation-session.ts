/**
 * Translation Session Storage Service
 * 翻译会话存储 - 断点续传支持
 */

import type { FileProgress } from '@/lib/types/file-progress';
import type { TranslationBatch } from '@/lib/engine/batcher';

const SESSION_KEY = 'subpilot_translation_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * 存储的文件信息 (File对象不可序列化)
 */
export interface StoredFile {
    name: string;
    content: string;
    lineCount: number;
}

/**
 * 翻译会话数据结构
 */
export interface TranslationSession {
    /** 唯一ID */
    id: string;
    /** 创建时间 */
    createdAt: number;
    /** 最后更新时间 */
    updatedAt: number;

    /** 文件信息 */
    files: StoredFile[];

    /** 每个文件的进度 */
    fileProgresses: FileProgress[];

    /** 当前正在翻译的文件索引 */
    currentFileIndex: number;

    /** 已完成的翻译批次 (按文件索引) */
    completedBatches: Record<number, TranslationBatch[]>;

    /** 翻译配置 */
    config: {
        sourceLanguage: string;
        targetLanguage: string;
        providerId: string;
        modelId: string;
        subtitleMode: 'bilingual' | 'translate_only';
    };
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建新会话
 */
export function createSession(
    files: StoredFile[],
    config: TranslationSession['config']
): TranslationSession {
    const now = Date.now();
    return {
        id: generateSessionId(),
        createdAt: now,
        updatedAt: now,
        files,
        fileProgresses: files.map((f, i) => ({
            fileIndex: i,
            fileName: f.name,
            status: 'pending' as const,
            current: 0,
            total: f.lineCount,
        })),
        currentFileIndex: 0,
        completedBatches: {},
        config,
    };
}

/**
 * 保存会话到 localStorage
 */
export function saveSession(session: TranslationSession): void {
    try {
        session.updatedAt = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
        console.error('[TranslationSession] Failed to save session:', error);
    }
}

/**
 * 从 localStorage 获取会话
 */
export function getSession(): TranslationSession | null {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;

        const session: TranslationSession = JSON.parse(data);

        // 检查是否过期
        if (Date.now() - session.updatedAt > SESSION_EXPIRY_MS) {
            clearSession();
            return null;
        }

        return session;
    } catch (error) {
        console.error('[TranslationSession] Failed to get session:', error);
        return null;
    }
}

/**
 * 清除会话
 */
export function clearSession(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.error('[TranslationSession] Failed to clear session:', error);
    }
}

/**
 * 检查是否有可恢复的会话
 */
export function hasRecoverableSession(): boolean {
    const session = getSession();
    if (!session) return false;

    // 检查是否有未完成的文件
    return session.fileProgresses.some(fp =>
        fp.status === 'pending' || fp.status === 'translating'
    );
}

/**
 * 更新文件进度
 */
export function updateFileProgress(
    fileIndex: number,
    progress: Partial<FileProgress>
): void {
    const session = getSession();
    if (!session) return;

    session.fileProgresses[fileIndex] = {
        ...session.fileProgresses[fileIndex],
        ...progress,
    };
    session.currentFileIndex = fileIndex;
    saveSession(session);
}

/**
 * 添加完成的批次
 */
export function addCompletedBatch(
    fileIndex: number,
    batch: TranslationBatch
): void {
    const session = getSession();
    if (!session) return;

    if (!session.completedBatches[fileIndex]) {
        session.completedBatches[fileIndex] = [];
    }
    session.completedBatches[fileIndex].push(batch);

    // 更新进度
    const totalCompleted = session.completedBatches[fileIndex].reduce(
        (sum, b) => sum + b.lines.length, 0
    );
    session.fileProgresses[fileIndex].current = totalCompleted;

    saveSession(session);
}

/**
 * 获取会话摘要信息
 */
export function getSessionSummary(session: TranslationSession): {
    fileCount: number;
    completedFiles: number;
    totalLines: number;
    completedLines: number;
    timeSinceUpdate: string;
} {
    const completedFiles = session.fileProgresses.filter(
        fp => fp.status === 'completed'
    ).length;

    const totalLines = session.files.reduce((sum, f) => sum + f.lineCount, 0);
    const completedLines = session.fileProgresses.reduce(
        (sum, fp) => sum + fp.current, 0
    );

    const minutes = Math.round((Date.now() - session.updatedAt) / 60000);
    const timeSinceUpdate = minutes < 60
        ? `${minutes} 分钟前`
        : `${Math.round(minutes / 60)} 小时前`;

    return {
        fileCount: session.files.length,
        completedFiles,
        totalLines,
        completedLines,
        timeSinceUpdate,
    };
}

/**
 * 将 File 对象转换为可存储的格式
 */
export async function filesToStoredFiles(files: File[]): Promise<StoredFile[]> {
    return Promise.all(
        files.map(async (file) => {
            const content = await file.text();
            const lineCount = content.split('\n').filter(l => l.trim()).length;
            return {
                name: file.name,
                content,
                lineCount,
            };
        })
    );
}
