/**
 * SDK Adapter（仅服务端）
 * 按 SdkAdapterConfig.kind 解析模型实例，无 provider-id switch
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderDescriptor, SdkCacheConfig } from './descriptor';

export interface CreateSdkModelArgs {
  model: string;
  apiKey: string;
  baseUrl?: string;
  cacheConfig?: SdkCacheConfig;
}

function normalizeCompatibleBaseUrl(url: string): string {
  return url.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, '');
}

/**
 * 从 Descriptor 创建 AI SDK 模型；descriptor.sdk 缺失则抛错
 */
export function createSdkModelFromDescriptor(
  descriptor: ProviderDescriptor,
  args: CreateSdkModelArgs
) {
  const sdk = descriptor.sdk;
  if (!sdk) {
    throw new Error(
      `Provider '${descriptor.schema.id}' has no LLM sdk adapter`
    );
  }

  const { model, apiKey, baseUrl, cacheConfig } = args;

  switch (sdk.kind) {
    case 'ai-sdk-openai':
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || sdk.defaultBaseUrl,
      })(model);

    case 'ai-sdk-deepseek':
      return createDeepSeek({ apiKey })(model);

    case 'ai-sdk-google':
      return createGoogleGenerativeAI({ apiKey })(model);

    case 'openai-compatible': {
      const raw = baseUrl || sdk.defaultBaseUrl;
      if (!raw) {
        throw new Error(
          `Provider '${descriptor.schema.id}' requires baseUrl`
        );
      }
      const resolved = sdk.normalizeBaseUrl
        ? normalizeCompatibleBaseUrl(raw)
        : raw;

      return createOpenAICompatible({
        name: sdk.name,
        apiKey,
        baseURL: resolved,
        fetch:
          sdk.contextCache === 'doubao-session'
            ? async (url, init) => {
                if (
                  cacheConfig?.enabled &&
                  init &&
                  init.method === 'POST' &&
                  init.body
                ) {
                  try {
                    const body = JSON.parse(init.body as string);
                    body.context_cache = {
                      mode: 'session',
                      ttl: cacheConfig.ttl || 3600,
                    };
                    init.body = JSON.stringify(body);
                  } catch (e) {
                    console.warn(
                      'Failed to inject context_cache for Doubao',
                      e
                    );
                  }
                }
                return fetch(url, init);
              }
            : undefined,
      }).chatModel(model);
    }

    default: {
      const _exhaustive: never = sdk;
      throw new Error(`Unknown sdk kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** 规范化 baseUrl（供测试） */
export { normalizeCompatibleBaseUrl };
