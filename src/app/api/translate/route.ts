/**
 * Unified Translation API Route
 * 通过 ProviderDescriptor.sdk 解析模型，无 provider-id switch
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import '@/lib/providers';
import { registry } from '@/lib/providers/registry';
import { createSdkModelFromDescriptor } from '@/lib/providers/sdk-adapter';
import type { SdkCacheConfig } from '@/lib/providers/descriptor';

interface TranslateRequest {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  cacheConfig?: SdkCacheConfig;
}

export async function POST(request: NextRequest) {
  const requestId = `translate_${Date.now().toString(36)}`;
  const startTime = Date.now();

  try {
    const body: TranslateRequest = await request.json();
    const {
      provider,
      model,
      apiKey,
      baseUrl,
      messages,
      temperature = 0.3,
      cacheConfig,
    } = body;

    console.log(`[${requestId}] Translating with ${provider}/${model}`);
    console.log(`[${requestId}] Messages:`, JSON.stringify(messages, null, 2));

    const descriptor = registry.getDescriptor(provider);
    if (!descriptor) {
      return NextResponse.json(
        {
          error: {
            type: 'UNKNOWN',
            message: `Unknown provider: ${provider}`,
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const modelInstance = createSdkModelFromDescriptor(descriptor, {
      model,
      apiKey,
      baseUrl,
      cacheConfig,
    });

    const result = await generateText({
      model: modelInstance,
      messages,
      temperature,
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Success in ${duration}ms`);

    return NextResponse.json(
      {
        text: result.text,
        usage: result.usage,
      },
      {
        headers: {
          'X-Request-Id': requestId,
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[${requestId}] Error after ${duration}ms:`, message);

    let statusCode = 500;
    let errorType = 'UNKNOWN';

    if (
      message.includes('401') ||
      message.includes('auth') ||
      message.includes('key')
    ) {
      statusCode = 401;
      errorType = 'AUTH';
    } else if (message.includes('429') || message.includes('rate')) {
      statusCode = 429;
      errorType = 'RATE_LIMIT';
    } else if (message.includes('quota') || message.includes('insufficient')) {
      statusCode = 402;
      errorType = 'QUOTA';
    } else if (message.includes('Unknown provider') || message.includes('requires baseUrl')) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        error: {
          type: errorType,
          message,
          requestId,
        },
      },
      { status: statusCode }
    );
  }
}
