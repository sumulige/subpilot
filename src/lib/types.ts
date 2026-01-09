/**
 * Subtitle Translator - Core Types
 * 核心类型定义
 */

// ============================================================================
// Translation Request/Result
// ============================================================================

export type SubtitleMode = 'translate_only' | 'bilingual';

/** 翻译请求 */
export interface TranslationRequest {
    /** 待翻译文本 */
    text: string;
    /** 源语言 ('auto' = 自动检测) */
    source: string;
    /** 目标语言 */
    target: string;
    /** 上下文（LLM 使用，API 忽略） */
    context?: string;
    /** 采样温度 (0-1) */
    temperature?: number;
    /** 系统提示词 (System Prompt) */
    systemPrompt?: string;
    /** 取消信号 */
    signal?: AbortSignal;
}

/** 翻译结果 */
export interface TranslationResult {
    text: string;
    cached?: boolean;
    tokens?: { input: number; output: number };
}

// ============================================================================
// Provider Interface
// ============================================================================

/** Provider 类型 */
export type ProviderType = 'api' | 'llm';

/** Provider 接口 - 所有翻译服务必须实现 */
export interface Provider {
    readonly id: string;
    readonly name: string;
    readonly type: ProviderType;
    translate(req: TranslationRequest): Promise<TranslationResult>;
}

/** Provider 配置 */
export type ProviderConfig = Record<string, string | number | boolean>;

/** Provider 工厂函数 */
export type ProviderFactory = (config: ProviderConfig) => Provider;

// ============================================================================
// Provider Schema (UI 自动生成)
// ============================================================================

export type FieldType = 'string' | 'number' | 'boolean' | 'select';

export interface FieldSchema {
    type: FieldType;
    label: string;
    required?: boolean;
    secret?: boolean;
    default?: string | number | boolean;
    options?: string[];
    placeholder?: string;
}

/** Provider rate limit configuration for high-performance batching */
export interface RateLimitConfig {
    /** Max parallel requests */
    maxConcurrency: number;
    /** Requests per minute limit */
    maxRequestsPerMinute: number;
    /** Recommended lines per batch */
    recommendedBatchSize: number;
    /** Recommended temperature for translation */
    recommendedTemperature: number;
}

export interface ProviderSchema {
    id: string;
    name: string;
    type: ProviderType;
    fields: Record<string, FieldSchema>;
    /** Rate limit config for high-performance mode */
    rateLimit?: RateLimitConfig;
}

// ============================================================================
// Custom Provider Template
// ============================================================================

export interface CustomRequestTemplate {
    url: string;
    method: 'POST' | 'GET';
    headers: Record<string, string>;
    body: string;
}

export interface CustomResponseTemplate {
    jsonPath: string;
}

export interface CustomProviderTemplate {
    name: string;
    type: 'openai-compatible' | 'custom';
    // OpenAI 兼容模式
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    // 完全自定义
    request?: CustomRequestTemplate;
    response?: CustomResponseTemplate;
}

// ============================================================================
// Subtitle Types
// ============================================================================

export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'lrc';

export interface SubtitleLine {
    index: number;
    start: number; // 毫秒
    end: number;
    text: string;
    translated?: string;
    style?: string; // ASS 样式
}

export interface Subtitle {
    format: SubtitleFormat;
    lines: SubtitleLine[];
    metadata?: Record<string, string>;
}

// ============================================================================
// Parser Interface
// ============================================================================

export interface Parser {
    parse(content: string): Subtitle;
    serialize(subtitle: Subtitle): string;
}

// ============================================================================
// Batch Translation
// ============================================================================

export interface BatchOptions {
    concurrency?: number;
    retries: number;
    timeout: number;
}

export interface TranslationProgress {
    current: number;
    total: number;
    file?: string;
}
