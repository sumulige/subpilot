/**
 * Smart Batcher
 * 智能批量翻译 - 合并请求 + 上下文感知
 */

import type { Provider, SubtitleLine, TranslationProgress, RateLimitConfig } from '../types';
import { cache } from './cache';
import { withRetry, TranslationError, ErrorType } from './errors';
import { registry } from '../providers/registry';

// ============================================================================
// Configuration
// ============================================================================

export interface BatcherConfig {
    /** 每批最大字符数 */
    maxCharsPerBatch: number;
    /** 每批最大行数 */
    maxLinesPerBatch: number;
    /** 行分隔符 */
    lineSeparator: string;
    /** 上下文行数（前后各取 N 行） */
    contextLines: number;
    /** 最大并发批次 */
    concurrency: number;
    /** 每秒最大请求数 (0 = 无限制) */
    maxRequestsPerSecond: number;
    /** 自定义 System Prompt */
    systemPromptTemplate?: string;
    /** 最大重试次数 */
    maxRetries: number;
    /** Debug 模式 */
    debug?: boolean;
    userPromptTemplate?: string;
    richText?: boolean;
    tacticLite?: boolean;
}

export const SYSTEM_PROMPT = `You are a professional {{to}} native translator who needs to fluently translate text into {{to}}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text{{rich_text_rule}}
3. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
4. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output{{title_prompt}}{{summary_prompt}}{{terms_prompt}}

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations

## TACTIC Context
{{tactic_context}}

## Examples
### Multi-paragraph Input:
Paragraph A
%%
Paragraph B
%%
Paragraph C
%%
Paragraph D

### Multi-paragraph Output:
Translation A
%%
Translation B
%%
Translation C
%%
Translation D

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators`;

export const DEFAULT_USER_PROMPT = 'Translate to {{to}}:\n\n{{text}}';

export const DEFAULT_CONFIG: BatcherConfig = {
    maxCharsPerBatch: 3000,       // Optimized for 5000+ line files
    maxLinesPerBatch: 15,         // Larger batches = fewer API calls
    lineSeparator: '\n%%\n',
    contextLines: 2,              // Reduced for speed
    concurrency: 20,              // High default, will be overridden by provider limits
    maxRequestsPerSecond: 0,      // 禁用 RPS 限制，让并发生效
    systemPromptTemplate: SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT,
    richText: true,
    tacticLite: false,            // 默认关闭以获得更快速度
    maxRetries: 3,
    debug: false,                 // 默认关闭调试日志
};

/**
 * Get effective batcher config by merging provider-specific rate limits
 */
export function getEffectiveConfig(
    providerId: string,
    userConfig: Partial<BatcherConfig> = {}
): BatcherConfig {
    const schema = registry.getSchema(providerId);
    const rateLimit: RateLimitConfig | undefined = schema?.rateLimit;

    // Filter out undefined values from userConfig
    const cleanUserConfig = Object.fromEntries(
        Object.entries(userConfig).filter(([_, v]) => v !== undefined)
    );

    // Provider limits override defaults, user config overrides provider limits
    return {
        ...DEFAULT_CONFIG,
        concurrency: rateLimit?.maxConcurrency ?? DEFAULT_CONFIG.concurrency,
        maxRequestsPerSecond: Math.floor((rateLimit?.maxRequestsPerMinute ?? 1200) / 60),
        maxLinesPerBatch: rateLimit?.recommendedBatchSize ?? DEFAULT_CONFIG.maxLinesPerBatch,
        ...cleanUserConfig, // User config overrides (only defined values)
    };
}

// ============================================================================
// Batch Types
// ============================================================================

/** 一个翻译批次 */
export interface TranslationBatch {
    /** 批次索引 */
    index: number;
    /** 批次中的字幕行 */
    lines: SubtitleLine[];
    /** 合并后的文本 */
    mergedText: string;
    /** 上下文 */
    context: {
        before: string; // 前文（已翻译）
        after: string;  // 后文（原文）
        research?: string; // TACTIC-Lite 调研结果
    };
    /** 批次状态 */
    status: 'pending' | 'translating' | 'completed' | 'failed';
    /** 翻译结果（按行拆分后） */
    translations?: string[];
    /** 错误信息 */
    error?: TranslationError;
}

// ============================================================================
// Batching Logic
// ============================================================================

/**
 * 将字幕行分组为批次
 */
export function createBatches(
    lines: SubtitleLine[],
    config: Partial<BatcherConfig> = {}
): TranslationBatch[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const batches: TranslationBatch[] = [];

    let currentBatch: SubtitleLine[] = [];
    let currentChars = 0;

    for (const line of lines) {
        const lineChars = line.text.length + cfg.lineSeparator.length;

        // 检查是否需要开始新批次
        const shouldStartNew =
            currentBatch.length >= cfg.maxLinesPerBatch ||
            (currentChars + lineChars > cfg.maxCharsPerBatch && currentBatch.length > 0);

        if (shouldStartNew) {
            batches.push(createBatchFromLines(currentBatch, batches.length, cfg));
            currentBatch = [];
            currentChars = 0;
        }

        currentBatch.push(line);
        currentChars += lineChars;
    }

    // 处理最后一批
    if (currentBatch.length > 0) {
        batches.push(createBatchFromLines(currentBatch, batches.length, cfg));
    }

    return batches;
}

/** 从字幕行创建批次对象 */
function createBatchFromLines(
    lines: SubtitleLine[],
    index: number,
    config: BatcherConfig
): TranslationBatch {
    const mergedText = lines.map((l) => l.text).join(config.lineSeparator);

    return {
        index,
        lines,
        mergedText,
        context: { before: '', after: '' },
        status: 'pending',
    };
}

/**
 * 为批次填充上下文
 */
export function fillBatchContext(
    batches: TranslationBatch[],
    config: Partial<BatcherConfig> = {}
): void {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        // 前文上下文：使用前一批的翻译结果（如果有）
        if (i > 0) {
            const prevBatch = batches[i - 1];
            if (prevBatch.translations) {
                const contextLines = prevBatch.translations.slice(-cfg.contextLines);
                batch.context.before = contextLines.join('\n');
            } else {
                // 如果还没翻译，用原文
                const contextLines = prevBatch.lines.slice(-cfg.contextLines).map((l) => l.text);
                batch.context.before = contextLines.join('\n');
            }
        }

        // 后文上下文：使用下一批的原文
        if (i < batches.length - 1) {
            const nextBatch = batches[i + 1];
            const contextLines = nextBatch.lines.slice(0, cfg.contextLines).map((l) => l.text);
            batch.context.after = contextLines.join('\n');
        }
    }
}

// ============================================================================
// Translation Execution
// ============================================================================

export interface BatchTranslateOptions {
    provider: Provider;
    source: string;
    target: string;
    config?: Partial<BatcherConfig>;
    onProgress?: (progress: TranslationProgress) => void;
    onBatchComplete?: (batch: TranslationBatch) => void;
    signal?: AbortSignal;
    /** 采样温度 */
    temperature?: number;
    /** 翻译模式 */
    subtitleMode?: 'translate_only' | 'bilingual';
}

/**
 * TACTIC-Lite: 分析阶段 (Agent 1/2)
 * 对应 TACTIC 的 ContextAgent + ResearchAgent
 */
async function performResearch(
    batch: TranslationBatch,
    provider: Provider,
    source: string,
    target: string,
    signal?: AbortSignal
): Promise<string> {
    const researchPrompt = `Analyze the following text for translation context (Source: ${source}, Target: ${target}).
Identify:
1. Speaker tone/mood (formal, casual, tense, etc.)
2. Key terms or proper nouns that need specific handling
3. Plot context based on the lines

Text to analyze:
${batch.mergedText}

Output concise analysis in bullet points.`;

    try {
        const result = await withRetry(
            () => provider.translate({
                text: researchPrompt,
                source: 'en', // Analysis prompt is in English
                target: 'en', // Output in English (or target language, but English usually better for reasoning)
                systemPrompt: 'You are a professional context analyzer for subtitle translation.',
                temperature: 0.3, // Lower temp for analysis
                signal,
            }),
            { maxRetries: 2, signal }
        );
        return result.text;
    } catch (e) {
        console.warn(`[Batch ${batch.index}] Research failed, proceeding without context.`, e);
        return '';
    }
}

/**
 * 翻译单个批次
 */
async function translateBatch(
    batch: TranslationBatch,
    options: BatchTranslateOptions
): Promise<void> {
    const { provider, source, target, config = {} } = options;
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const cacheKey = `${provider.id}:${source}:${target}:${cfg.tacticLite ? 'tactic' : 'std'}`;

    const batchStartTime = Date.now();
    console.log(`⏱️ [Batch ${batch.index}] 开始翻译，共 ${batch.lines.length} 行`);

    batch.status = 'translating';

    try {
        // 检查缓存（整批）
        const batchCacheKey = cache.key(batch.mergedText, cacheKey);
        const cachedResult = await cache.get(batchCacheKey);

        let translatedText: string;

        if (cachedResult) {
            translatedText = cachedResult;
        } else {
            // TACTIC-Lite Workflow: Only supports LLM providers
            if (cfg.tacticLite) {
                if (provider.type === 'llm') {
                    if (cfg.debug) console.log(`[Batch ${batch.index}] 🧠 Performing TACTIC Research...`);
                    // Step 1: Research
                    const researchResult = await performResearch(batch, provider, source, target, options.signal);
                    batch.context.research = researchResult;
                    if (cfg.debug) console.log(`[Batch ${batch.index}] 📝 Research Result:`, researchResult);
                } else {
                    if (cfg.debug) console.warn(`[Batch ${batch.index}] TACTIC-Lite skipped: Provider '${provider.name}' is not an LLM.`);
                }
            }

            // Step 2: Translate (Refinement)
            const systemPrompt = buildContextPrompt(
                batch.context,
                source,
                target,
                cfg.systemPromptTemplate,
                cfg.lineSeparator,
                cfg.richText ?? true,
            );
            const userPrompt = buildUserPrompt(batch.mergedText, source, target, cfg.userPromptTemplate);

            if (cfg.debug) {
                console.group(`[Batch ${batch.index}] Translating`);
                console.log('Text:', batch.mergedText);
                console.log('Context:', batch.context);
                console.log('System Prompt:', systemPrompt);
                console.log('User Prompt:', userPrompt);
                console.groupEnd();
            }

            // 调用翻译
            const apiStartTime = Date.now();
            const result = await withRetry(
                () => provider.translate({
                    text: userPrompt, // Send formatted prompt as text
                    source,
                    target,
                    systemPrompt, // Pass evaluated system prompt
                    temperature: options.temperature,
                    signal: options.signal,
                }),
                {
                    maxRetries: cfg.maxRetries,
                    signal: options.signal,
                    onRetry: (error, attempt, delay) => {
                        console.warn(
                            `Batch ${batch.index} retry ${attempt}: ${error.message}, waiting ${delay}ms`
                        );
                    },
                }
            );
            const apiDuration = Date.now() - apiStartTime;
            console.log(`⏱️ [Batch ${batch.index}] API 调用耗时: ${apiDuration}ms`);

            // 清理结果：移除 <think> 标签和 markdown 代码块
            let cleanedText = result.text
                .replace(/<think>[\s\S]*?<\/think>/g, '') // 移除思维链
                .replace(/```[\s\S]*?```/g, (match) => {
                    return match.replace(/```\w*\n?|```/g, '');
                })
                .trim();

            // 移除可能存在的 "Here is the translation:" 等废话 (简单启发式)
            // 但如果用了 System Prompt，通常模型会遵守 Output Only.

            if (cfg.debug) {
                console.log(`[Batch ${batch.index}] Raw:`, result.text);
                console.log(`[Batch ${batch.index}] Cleaned:`, cleanedText);
            }

            translatedText = cleanedText;

            // 缓存结果
            await cache.set(batchCacheKey, translatedText);
        }

        // 拆分翻译结果
        batch.translations = splitTranslation(translatedText, batch.lines.length, cfg.lineSeparator);
        batch.status = 'completed';

        const batchDuration = Date.now() - batchStartTime;
        console.log(`✅ [Batch ${batch.index}] 完成，总耗时: ${batchDuration}ms`);
    } catch (e) {
        const batchDuration = Date.now() - batchStartTime;
        console.error(`❌ [Batch ${batch.index}] 失败，耗时: ${batchDuration}ms`);
        batch.status = 'failed';
        batch.error = e instanceof TranslationError
            ? e
            : new TranslationError((e as Error).message, ErrorType.UNKNOWN, { originalError: e as Error });
        throw batch.error;
    }
}

/**
 * 构建 User Prompt
 */
function buildUserPrompt(
    text: string,
    source: string,
    target: string,
    template?: string
): string {
    const defaultTemplate = '{{text}}';
    const usedTemplate = template || defaultTemplate;
    return usedTemplate
        .replace(/{{to}}/g, target)
        .replace(/{{from}}/g, source)
        .replace(/{{text}}/g, text);
}

/**
 * 构建上下文提示 (System Prompt)
 */
function buildContextPrompt(
    context: { before: string; after: string; research?: string },
    source: string,
    target: string,
    template?: string,
    separator?: string,
    richText: boolean = true,
): string {
    // 如果没有模板，使用默认逻辑
    if (!template) {
        const parts: string[] = [];

        if (context.before) {
            parts.push(`[Previous translated lines for context]\n${context.before}`);
        }
        if (context.after) {
            parts.push(`[Following lines for context (original ${source})]\n${context.after}`);
        }

        if (parts.length === 0) {
            return '';
        }

        return `Maintain consistency with the surrounding context when translating to ${target}:\n\n${parts.join('\n\n')}`;
    }

    // 使用自定义模板
    let prompt = template
        .replace(/{{to}}/g, target)
        .replace(/{{from}}/g, source);

    // 动态注入 Rich Text 规则
    const richTextRule = richText
        ? '\n3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency'
        : '';
    prompt = prompt.replace(/{{rich_text_rule}}/g, richTextRule);

    // 注入 TACTIC-Lite 上下文
    // 如果有 research 数据，就注入；否则移除占位符
    const tacticContext = context.research
        ? `### Context Analysis (TACTIC-Lite)\n${context.research}`
        : '';
    prompt = prompt.replace(/{{tactic_context}}/g, tacticContext);

    // 占位符处理
    prompt = prompt
        .replace(/{{title_prompt}}/g, '')
        .replace(/{{summary_prompt}}/g, '')
        .replace(/{{terms_prompt}}/g, '');

    // 注入上下文数据
    const contextParts: string[] = [];
    if (context.before) contextParts.push(`PREVIOUS CONTEXT:\n${context.before}`);
    if (context.after) contextParts.push(`FUTURE CONTEXT:\n${context.after}`);

    if (contextParts.length > 0) {
        return `${prompt}\n\n${contextParts.join('\n\n')}`;
    }

    return prompt;
}

/**
 * 拆分翻译结果为各行
 */
function splitTranslation(
    translatedText: string,
    expectedLines: number,
    separator: string
): string[] {
    // 尝试用分隔符拆分
    const parts = translatedText.split(separator);

    // 如果行数匹配，直接返回
    if (parts.length === expectedLines) {
        return parts.map((p) => p.trim());
    }

    // 行数不匹配时的回退策略
    // 策略1：尝试用常见分隔符
    const fallbackSeparators = ['\n---\n', '\n\n', '\n'];
    for (const sep of fallbackSeparators) {
        if (sep === separator) continue;
        const fallbackParts = translatedText.split(sep);
        if (fallbackParts.length === expectedLines) {
            return fallbackParts.map((p) => p.trim());
        }
    }

    // 策略2：如果结果更多，取前 N 个
    if (parts.length > expectedLines) {
        return parts.slice(0, expectedLines).map((p) => p.trim());
    }

    // 策略3：如果结果更少，补充空字符串
    const result = parts.map((p) => p.trim());
    while (result.length < expectedLines) {
        result.push('');
    }

    console.warn(
        `Translation split mismatch: expected ${expectedLines}, got ${parts.length}`
    );

    return result;
}

// ============================================================================
// Parallel Execution with Concurrency Control
// ============================================================================

/**
 * 速率限制器 (Token Bucket)
 */
function createRateLimiter(rps: number) {
    if (rps <= 0) return () => Promise.resolve();

    const interval = 1000 / rps;
    let lastRequestTime = 0;
    const queue: Array<() => void> = [];

    const processQueue = () => {
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;

        if (queue.length === 0) return;

        if (timeSinceLast >= interval) {
            const resolve = queue.shift();
            lastRequestTime = Date.now();
            resolve?.();

            // Scheduling next
            if (queue.length > 0) {
                setTimeout(processQueue, interval);
            }
        } else {
            const delay = interval - timeSinceLast;
            setTimeout(processQueue, delay);
        }
    };

    return () => {
        return new Promise<void>((resolve) => {
            queue.push(resolve);
            if (queue.length === 1) { // 如果是队列中的第一个，触发处理
                processQueue();
            }
        });
    };
}

/**
 * 并发限制器
 */
function createLimiter(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const next = () => {
        if (queue.length > 0 && active < concurrency) {
            const fn = queue.shift();
            if (fn) fn();
        }
    };

    return <T>(fn: () => Promise<T>): Promise<T> => {
        return new Promise((resolve, reject) => {
            const run = async () => {
                active++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (e) {
                    reject(e);
                } finally {
                    active--;
                    next();
                }
            };

            if (active < concurrency) {
                run();
            } else {
                queue.push(run);
            }
        });
    };
}

/**
 * 批量翻译所有字幕行
 */
export async function translateWithBatching(
    lines: SubtitleLine[],
    options: BatchTranslateOptions
): Promise<SubtitleLine[]> {
    const totalStartTime = Date.now();
    console.log(`🚀 开始批量翻译，共 ${lines.length} 行`);

    // Use provider-specific rate limits merged with user config
    const config = getEffectiveConfig(options.provider.id, options.config);

    console.log(`📋 [Batcher] Provider: ${options.provider.id}, Effective config:`, {
        concurrency: config.concurrency,
        maxRequestsPerSecond: config.maxRequestsPerSecond,
        maxLinesPerBatch: config.maxLinesPerBatch,
    });

    // 过滤空行，保留原始索引映射
    const nonEmptyLines: { original: SubtitleLine; index: number }[] = [];
    const results: SubtitleLine[] = lines.map((line) => ({ ...line }));

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].text.trim()) {
            nonEmptyLines.push({ original: lines[i], index: i });
        } else {
            results[i].translated = '';
        }
    }

    if (nonEmptyLines.length === 0) {
        return results;
    }

    // 创建批次
    const batches = createBatches(
        nonEmptyLines.map((n) => n.original),
        config
    );

    // 进度追踪
    let completedLines = 0;
    const totalLines = nonEmptyLines.length;

    // 创建限制器
    const limit = createLimiter(config.concurrency);
    const rateLimit = createRateLimiter(config.maxRequestsPerSecond);

    // 并发处理批次
    // 注意：上下文依赖前一批次，但我们可以预先创建任务，通过 Promise 链处理依赖
    // 这里的实现简化为：并发执行，但如果 RateLimit 限制，会等待
    // 对于上下文：严格来说，Context 需要前一批完成。如果我们要并发，Context 就不能依赖"已翻译"的内容，
    // 只能依赖"原文"。
    // 但是 implementation plan 里提到"前一批翻译结果作为上下文"。
    // 这意味着必须串行执行，或者 Pipeline 执行。
    // 为了支持并发且保持 Context，我们这里做一个折衷：
    // 如果 concurrency > 1，只能使用 'after' context (原文)，不能使用 'before' context (译文)。
    // 或者，我们接受 Context 是旧的/空的。
    // 考虑到 Context 对质量的重要性，默认行为应该是串行 (concurrency=1) 或者流水线。
    // 但用户要求并发。
    // 实际上，如果 Context 依赖译文，那就必须串行。
    // 如果 Context 依赖原文，就可以并发。
    // 目前 Batcher.ts 的 fillBatchContext 使用了 Translated 文本。
    // 让我们修改策略：如果有并发，Context.before 只能用原文。

    // 辅助函数：执行单个批次
    const runBatch = async (batch: TranslationBatch) => {
        // 等待速率限制
        await rateLimit();

        // 填充上下文 (在执行时动态填充，以获取最新的前一批结果)
        // 注意：如果是并发执行，前一批可能还没完成，这里 fillBatchContext 会回退到使用原文
        fillBatchContext(batches, config);

        await translateBatch(batch, options);

        completedLines += batch.lines.length;
        options.onProgress?.({ current: completedLines, total: totalLines });
        options.onBatchComplete?.(batch);
    };

    // 使用并发限制器执行所有批次
    await Promise.all(
        batches.map((batch) =>
            limit(() => runBatch(batch).catch((e) => {
                // 单个批次失败不应该导致整体 Promise.all 立刻失败（除非是取消）
                // 已经在 translateBatch 内部处理了 status 和 error
                // 这里我们 catch 住，以免 Promise.all 抛出
                if (e instanceof TranslationError && e.type === ErrorType.CANCELLED) {
                    throw e;
                }
                console.error(`Batch ${batch.index} processing failed:`, e);
            }))
        )
    );

    const totalDuration = Date.now() - totalStartTime;
    console.log(`🏁 批量翻译完成，总耗时: ${totalDuration}ms，共 ${batches.length} 批次`);

    // 映射翻译结果回原始行
    let lineIndex = 0;
    for (const batch of batches) {
        if (batch.translations) {
            for (let i = 0; i < batch.lines.length; i++) {
                const originalIndex = nonEmptyLines[lineIndex].index;
                results[originalIndex].translated = batch.translations[i];
                lineIndex++;
            }
        } else {
            // 如果批次失败，填充空字符串或保留原文
            for (let i = 0; i < batch.lines.length; i++) {
                lineIndex++;
            }
        }
    }

    return results;
}
