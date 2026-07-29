/**
 * Execute：单批次翻译（缓存 / TACTIC / glossary / split）
 */

import type { Provider, TranslationProgress } from '../types';
import { retrieveGlossaryMatches } from './glossary';
import { cache } from './cache';
import { withRetry, TranslationError, ErrorType } from './errors';
import { createLogger, LogLevel } from '../logger';
import { buildCacheSuffix, glossaryHash } from './cache-key';
import {
  buildSystemPrompt,
  buildUserPrompt,
  DEFAULT_USER_PROMPT,
} from './prompts';
import {
  DEFAULT_CONFIG,
  type BatcherConfig,
  type TranslationBatch,
} from './batch-config';

export interface BatchTranslateOptions {
  provider: Provider;
  source: string;
  target: string;
  config?: Partial<BatcherConfig>;
  onProgress?: (progress: TranslationProgress) => void;
  onBatchComplete?: (batch: TranslationBatch) => void;
  signal?: AbortSignal;
  temperature?: number;
  subtitleMode?: 'translate_only' | 'bilingual';
}

/** TACTIC-Lite：分析阶段 */
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
      () =>
        provider.translate({
          text: researchPrompt,
          source: 'en',
          target: 'en',
          systemPrompt:
            'You are a professional context analyzer for subtitle translation.',
          temperature: 0.3,
          signal,
        }),
      { maxRetries: 2, signal }
    );
    return result.text;
  } catch (e) {
    console.warn(
      `[Batch ${batch.index}] Research failed, proceeding without context.`,
      e
    );
    return '';
  }
}

/**
 * 拆分翻译结果为各行
 */
export function splitTranslation(
  translatedText: string,
  expectedLines: number,
  separator: string
): string[] {
  const parts = translatedText.split(separator);

  if (parts.length === expectedLines) {
    return parts.map((p) => p.trim());
  }

  const fallbackSeparators = ['\n---\n', '\n\n', '\n'];
  for (const sep of fallbackSeparators) {
    if (sep === separator) continue;
    const fallbackParts = translatedText.split(sep);
    if (fallbackParts.length === expectedLines) {
      return fallbackParts.map((p) => p.trim());
    }
  }

  if (parts.length > expectedLines) {
    return parts.slice(0, expectedLines).map((p) => p.trim());
  }

  const result = parts.map((p) => p.trim());
  while (result.length < expectedLines) {
    result.push('');
  }

  return result;
}

/**
 * 翻译单个批次
 */
export async function translateBatch(
  batch: TranslationBatch,
  options: BatchTranslateOptions
): Promise<void> {
  const { provider, source, target, config = {} } = options;
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = buildCacheSuffix({
    providerId: provider.id,
    source,
    target,
    mode: cfg.tacticLite ? 'tactic' : 'std',
    glossaryHash: glossaryHash(cfg.glossary),
    temperature: options.temperature,
    promptVer: 'v1',
  });

  const log = createLogger(`Batch ${batch.index}`);
  if (cfg.debug) log.setLevel(LogLevel.DEBUG);
  const batchStartTime = Date.now();

  log.info(`⏱️ 开始翻译，共 ${batch.lines.length} 行`);

  batch.status = 'translating';

  try {
    const batchCacheKey = cache.key(batch.mergedText, cacheKey);
    const cachedResult = await cache.get(batchCacheKey);

    let translatedText: string;

    if (cachedResult) {
      translatedText = cachedResult;
    } else {
      if (cfg.tacticLite) {
        if (provider.type === 'llm') {
          log.debug(`🧠 Performing TACTIC Research...`);
          const researchResult = await performResearch(
            batch,
            provider,
            source,
            target,
            options.signal
          );
          batch.context.research = researchResult;
          log.debug(`📝 Research Result:`, researchResult);
        } else {
          log.debug(
            `TACTIC-Lite skipped: Provider '${provider.name}' is not an LLM.`
          );
        }
      }

      const matchedGlossary = cfg.glossary
        ? retrieveGlossaryMatches(batch.mergedText, cfg.glossary)
        : [];
      if (matchedGlossary.length > 0) {
        log.debug(`📖 Glossary Matches: ${matchedGlossary.length} terms`);
      }

      const systemPrompt = buildSystemPrompt({
        targetLang: target,
        tacticContext: batch.context.research,
        richText: cfg.richText ?? true,
        previousContext: batch.context.before,
        futureContext: batch.context.after,
        glossary: matchedGlossary,
      });

      const userPrompt = buildUserPrompt(
        batch.mergedText,
        cfg.userPromptTemplate || DEFAULT_USER_PROMPT,
        target
      );

      log.debug('Prompt details:', {
        text: batch.mergedText,
        context: batch.context,
        systemPrompt,
        userPrompt,
      });

      const apiStartTime = Date.now();
      const result = await withRetry(
        () =>
          provider.translate({
            text: userPrompt,
            source,
            target,
            systemPrompt,
            temperature: options.temperature,
            signal: options.signal,
            cacheConfig: cfg.enableContextCaching
              ? { enabled: true }
              : undefined,
          }),
        {
          maxRetries: cfg.maxRetries,
          signal: options.signal,
          onRetry: (error, attempt, delay) => {
            log.warn(`retry ${attempt}: ${error.message}, waiting ${delay}ms`);
          },
        }
      );
      const apiDuration = Date.now() - apiStartTime;
      log.debug(`API 调用耗时: ${apiDuration}ms`);

      const cleanedText = result.text
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/```[\s\S]*?```/g, (match) => {
          return match.replace(/```\w*\n?|```/g, '');
        })
        .trim();

      log.debug(`Raw: ${result.text}`);
      log.debug(`Cleaned: ${cleanedText}`);

      translatedText = cleanedText;
      await cache.set(batchCacheKey, translatedText);
    }

    batch.translations = splitTranslation(
      translatedText,
      batch.lines.length,
      cfg.lineSeparator
    );
    batch.status = 'completed';

    const batchDuration = Date.now() - batchStartTime;
    log.info(`✅ 完成，总耗时: ${batchDuration}ms`);
  } catch (e) {
    const batchDuration = Date.now() - batchStartTime;
    log.error(`❌ 失败，耗时: ${batchDuration}ms`);
    batch.status = 'failed';
    batch.error =
      e instanceof TranslationError
        ? e
        : new TranslationError((e as Error).message, ErrorType.UNKNOWN, {
            originalError: e as Error,
          });
    throw batch.error;
  }
}
