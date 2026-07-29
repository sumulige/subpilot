'use client';

/**
 * Model Fetcher Utility
 * 是否支持动态模型 = Descriptor.modelsCatalog 是否存在
 */

import { registry } from './registry';
// 确保 Descriptor 已注册（client-safe side effects）
import './deepl';
import './google';
import './openai';
import './deepseek';
import './nvidia';
import './custom';
import './openrouter';
import './deepinfra';
import './tongyi';
import './doubao';

/**
 * Fetch available models from a provider via our internal API
 */
export async function fetchModels(
  providerId: string,
  apiKey: string
): Promise<string[]> {
  if (!apiKey || !supportsModelFetching(providerId)) {
    return [];
  }

  try {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providerId, apiKey }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.warn(
        `[ModelFetcher] Failed to fetch models for ${providerId}: ${response.status}`
      );
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`[ModelFetcher] Error for ${providerId}:`, data.error);
      return [];
    }

    return data.models || [];
  } catch (error) {
    console.warn(
      `[ModelFetcher] Error fetching models for ${providerId}:`,
      error
    );
    return [];
  }
}

/**
 * Check if a provider supports dynamic model fetching
 */
export function supportsModelFetching(providerId: string): boolean {
  return registry.supportsModelFetch(providerId);
}
