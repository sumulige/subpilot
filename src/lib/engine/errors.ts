/**
 * Translation Error System
 * 错误分类和智能重试策略
 */

// ============================================================================
// Error Types
// ============================================================================

/** 错误类型枚举 */
export enum ErrorType {
    /** 网络错误（连接失败、超时等） */
    NETWORK = 'NETWORK',
    /** 速率限制 */
    RATE_LIMIT = 'RATE_LIMIT',
    /** 认证失败 */
    AUTH = 'AUTH',
    /** 配额用尽 */
    QUOTA = 'QUOTA',
    /** 响应解析失败 */
    PARSE = 'PARSE',
    /** 请求取消 */
    CANCELLED = 'CANCELLED',
    /** 未知错误 */
    UNKNOWN = 'UNKNOWN',
}

/** 错误重试配置 */
export interface RetryConfig {
    /** 是否可重试 */
    retryable: boolean;
    /** 最大重试次数 */
    maxRetries: number;
    /** 基础延迟（毫秒） */
    baseDelay: number;
    /** 是否使用指数退避 */
    exponential: boolean;
}

/** 默认重试配置 */
const RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
    [ErrorType.NETWORK]: { retryable: true, maxRetries: 3, baseDelay: 1000, exponential: true },
    [ErrorType.RATE_LIMIT]: { retryable: true, maxRetries: 5, baseDelay: 2000, exponential: true },
    [ErrorType.AUTH]: { retryable: false, maxRetries: 0, baseDelay: 0, exponential: false },
    [ErrorType.QUOTA]: { retryable: false, maxRetries: 0, baseDelay: 0, exponential: false },
    [ErrorType.PARSE]: { retryable: true, maxRetries: 1, baseDelay: 500, exponential: false },
    [ErrorType.CANCELLED]: { retryable: false, maxRetries: 0, baseDelay: 0, exponential: false },
    [ErrorType.UNKNOWN]: { retryable: true, maxRetries: 2, baseDelay: 1000, exponential: true },
};

// ============================================================================
// Translation Error Class
// ============================================================================

/** 翻译错误 */
export class TranslationError extends Error {
    readonly type: ErrorType;
    readonly statusCode?: number;
    readonly retryAfter?: number; // 秒
    readonly originalError?: Error;
    readonly requestId?: string;

    constructor(
        message: string,
        type: ErrorType,
        options?: {
            statusCode?: number;
            retryAfter?: number;
            originalError?: Error;
            requestId?: string;
        }
    ) {
        super(message);
        this.name = 'TranslationError';
        this.type = type;
        this.statusCode = options?.statusCode;
        this.retryAfter = options?.retryAfter;
        this.originalError = options?.originalError;
        this.requestId = options?.requestId;
    }

    /** 获取重试配置 */
    getRetryConfig(): RetryConfig {
        return RETRY_CONFIGS[this.type];
    }

    /** 是否可重试 */
    isRetryable(): boolean {
        return this.getRetryConfig().retryable;
    }

    /** 获取用户友好的错误消息 */
    getUserMessage(): string {
        switch (this.type) {
            case ErrorType.NETWORK:
                return '网络连接失败，请检查网络后重试';
            case ErrorType.RATE_LIMIT:
                return `请求过于频繁，请等待 ${this.retryAfter || 60} 秒后重试`;
            case ErrorType.AUTH:
                return 'API Key 无效或已过期，请检查配置';
            case ErrorType.QUOTA:
                return 'API 配额已用尽，请充值或更换服务';
            case ErrorType.PARSE:
                return '翻译服务返回格式异常，正在重试';
            case ErrorType.CANCELLED:
                return '翻译已取消';
            default:
                return `翻译失败: ${this.message}`;
        }
    }
}

// ============================================================================
// Error Detection
// ============================================================================

/** 从 HTTP 状态码检测错误类型 */
export function detectErrorType(statusCode: number, message?: string): ErrorType {
    // 速率限制
    if (statusCode === 429) {
        return ErrorType.RATE_LIMIT;
    }

    // 认证错误
    if (statusCode === 401 || statusCode === 403) {
        return ErrorType.AUTH;
    }

    // 配额不足（某些 API 用 402）
    if (statusCode === 402) {
        return ErrorType.QUOTA;
    }

    // 服务器错误（可重试）
    if (statusCode >= 500) {
        return ErrorType.NETWORK;
    }

    // 客户端错误（通常不可重试）
    if (statusCode >= 400) {
        // 检查消息中是否有配额相关关键词
        if (message?.toLowerCase().includes('quota') ||
            message?.toLowerCase().includes('insufficient') ||
            message?.toLowerCase().includes('balance')) {
            return ErrorType.QUOTA;
        }
        return ErrorType.UNKNOWN;
    }

    return ErrorType.UNKNOWN;
}

/** 从错误对象检测错误类型 */
export function detectErrorFromException(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // 取消
    if (error.name === 'AbortError' || message.includes('abort') || message.includes('cancel')) {
        return ErrorType.CANCELLED;
    }

    // 网络错误
    if (message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('socket') ||
        message.includes('connection')) {
        return ErrorType.NETWORK;
    }

    // JSON 解析错误
    if (message.includes('json') || message.includes('parse') || message.includes('unexpected token')) {
        return ErrorType.PARSE;
    }

    return ErrorType.UNKNOWN;
}

/** 创建 TranslationError */
export function createTranslationError(
    error: Error | string,
    statusCode?: number,
    options?: { retryAfter?: number; requestId?: string }
): TranslationError {
    const message = typeof error === 'string' ? error : error.message;
    const originalError = typeof error === 'string' ? undefined : error;

    let type: ErrorType;
    if (statusCode) {
        type = detectErrorType(statusCode, message);
    } else if (originalError) {
        type = detectErrorFromException(originalError);
    } else {
        type = ErrorType.UNKNOWN;
    }

    return new TranslationError(message, type, {
        statusCode,
        retryAfter: options?.retryAfter,
        originalError,
        requestId: options?.requestId,
    });
}

// ============================================================================
// Retry Logic
// ============================================================================

/** 计算重试延迟 */
export function calculateRetryDelay(error: TranslationError, attempt: number): number {
    // 如果有 Retry-After 头，直接使用
    if (error.retryAfter) {
        return error.retryAfter * 1000;
    }

    const config = error.getRetryConfig();
    if (config.exponential) {
        // 指数退避：baseDelay * 2^attempt（加上随机抖动）
        const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 30% 抖动
        return Math.min(exponentialDelay + jitter, 30000); // 最大 30 秒
    }
    return config.baseDelay;
}

/** 带重试的执行函数 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: {
        maxRetries?: number;
        onRetry?: (error: TranslationError, attempt: number, delay: number) => void;
        signal?: AbortSignal;
    }
): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    let lastError: TranslationError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // 检查取消
        if (options?.signal?.aborted) {
            throw new TranslationError('Translation cancelled', ErrorType.CANCELLED);
        }

        try {
            return await fn();
        } catch (e) {
            // 转换为 TranslationError
            lastError = e instanceof TranslationError
                ? e
                : createTranslationError(e as Error);

            // 检查是否取消
            if (lastError.type === ErrorType.CANCELLED) {
                throw lastError;
            }

            // 检查是否可重试
            if (!lastError.isRetryable()) {
                throw lastError;
            }

            // 检查是否达到最大重试次数
            const config = lastError.getRetryConfig();
            if (attempt >= Math.min(maxRetries, config.maxRetries)) {
                throw lastError;
            }

            // 计算延迟并等待
            const delay = calculateRetryDelay(lastError, attempt);
            options?.onRetry?.(lastError, attempt + 1, delay);

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, delay);
                options?.signal?.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new TranslationError('Translation cancelled', ErrorType.CANCELLED));
                });
            });
        }
    }

    throw lastError ?? new TranslationError('Unknown error', ErrorType.UNKNOWN);
}
