/**
 * ProviderDescriptor — 一处定义，client registry / translate / models 共用
 */

import type { ProviderSchema, ProviderFactory } from '../types';

/** 翻译请求里的上下文缓存 */
export interface SdkCacheConfig {
  enabled: boolean;
  type?: 'explicit' | 'implicit';
  key?: string;
  ttl?: number;
}

/**
 * 声明式 SDK 适配（不含函数，可安全随 schema 进 client bundle）。
 * 真正的 create* 调用集中在 sdk-adapter.ts（仅 API route 引用）。
 */
export type SdkAdapterConfig =
  | {
      kind: 'ai-sdk-openai';
      defaultBaseUrl?: string;
    }
  | { kind: 'ai-sdk-deepseek' }
  | { kind: 'ai-sdk-google' }
  | {
      kind: 'openai-compatible';
      name: string;
      /** 未传 baseUrl 时的默认值；custom 可省略（强制用户填写） */
      defaultBaseUrl?: string;
      /** 去掉尾部 /chat/completions（豆包常见误配） */
      normalizeBaseUrl?: boolean;
      /** 豆包 session 级 context_cache 注入 */
      contextCache?: 'doubao-session';
    };

/** /api/models 目录配置 */
export interface ModelsCatalogConfig {
  baseUrl: string;
  modelsPath: string;
  responseParser?: 'openai' | 'doubao';
}

export interface ProviderDescriptor {
  schema: ProviderSchema;
  factory: ProviderFactory;
  /** LLM 走 /api/translate；API 型（DeepL）省略 */
  sdk?: SdkAdapterConfig;
  /** 支持动态拉模型列表时填写 */
  modelsCatalog?: ModelsCatalogConfig;
}
