/**
 * Batcher 配置与批次类型
 */

import type { RateLimitConfig } from '../types';
import type { SubtitleLine } from '../types';
import type { GlossaryItem } from './glossary';
import type { TranslationError } from './errors';
import { registry } from '../providers/registry';
import { buildSystemPrompt, DEFAULT_USER_PROMPT } from './prompts';

export { DEFAULT_USER_PROMPT };

/** 兼容旧导出 */
export const SYSTEM_PROMPT = buildSystemPrompt({ targetLang: '{{to}}' });

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
  /** 启用上下文缓存 (适用于支持的模型) */
  enableContextCaching?: boolean;
  /** 全局术语表 */
  glossary?: GlossaryItem[];
}

export const DEFAULT_CONFIG: BatcherConfig = {
  maxCharsPerBatch: 3000,
  maxLinesPerBatch: 15,
  lineSeparator: '\n%%\n',
  contextLines: 2,
  concurrency: 20,
  maxRequestsPerSecond: 0,
  systemPromptTemplate: SYSTEM_PROMPT,
  userPromptTemplate: DEFAULT_USER_PROMPT,
  richText: true,
  tacticLite: false,
  maxRetries: 3,
  debug: false,
  enableContextCaching: true,
};

/** 一个翻译批次 */
export interface TranslationBatch {
  index: number;
  lines: SubtitleLine[];
  mergedText: string;
  context: {
    before: string;
    after: string;
    research?: string;
  };
  status: 'pending' | 'translating' | 'completed' | 'failed';
  translations?: string[];
  error?: TranslationError;
}

/**
 * 合并 provider rateLimit 与用户配置（过滤 undefined）
 */
export function getEffectiveConfig(
  providerId: string,
  userConfig: Partial<BatcherConfig> = {}
): BatcherConfig {
  const schema = registry.getSchema(providerId);
  const rateLimit: RateLimitConfig | undefined = schema?.rateLimit;

  const cleanUserConfig = Object.fromEntries(
    Object.entries(userConfig).filter(([, v]) => v !== undefined)
  );

  return {
    ...DEFAULT_CONFIG,
    concurrency: rateLimit?.maxConcurrency ?? DEFAULT_CONFIG.concurrency,
    maxRequestsPerSecond: Math.floor(
      (rateLimit?.maxRequestsPerMinute ?? 1200) / 60
    ),
    maxLinesPerBatch:
      rateLimit?.recommendedBatchSize ?? DEFAULT_CONFIG.maxLinesPerBatch,
    ...cleanUserConfig,
  };
}
