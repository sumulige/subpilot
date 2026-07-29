/**
 * Models API Route
 * 从 ProviderDescriptor.modelsCatalog 拉模型列表，无硬编码表
 */

import { NextRequest, NextResponse } from 'next/server';
import '@/lib/providers';
import { registry } from '@/lib/providers/registry';

interface OpenAIModelsResponse {
  data: Array<{ id: string; object?: string; owned_by?: string }>;
  object?: string;
}

interface DoubaoModelsResponse {
  code?: number;
  data: Array<{ id: string; name?: string; status?: string }>;
  message?: string;
}

export function parseModels(
  data: unknown,
  parser: 'openai' | 'doubao' = 'openai'
): string[] {
  if (parser === 'doubao') {
    const doubaoData = data as DoubaoModelsResponse;
    if (doubaoData.code !== undefined && doubaoData.code !== 0) {
      console.warn('[Models API] Doubao API error:', doubaoData.message);
      return [];
    }
    return (doubaoData.data || [])
      .filter((m) => m.status === 'online' || !m.status)
      .map((m) => m.id)
      .filter((id) => id && typeof id === 'string')
      .sort();
  }

  const openaiData = data as OpenAIModelsResponse;
  return (openaiData.data || [])
    .map((m) => m.id)
    .filter((id) => id && typeof id === 'string')
    .sort();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, apiKey } = body as {
      providerId: string;
      apiKey: string;
    };

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const descriptor = registry.getDescriptor(providerId);
    const catalog = descriptor?.modelsCatalog;
    if (!catalog) {
      return NextResponse.json(
        { error: `Unknown provider or no models catalog: ${providerId}` },
        { status: 400 }
      );
    }

    const url = `${catalog.baseUrl}${catalog.modelsPath}`;
    console.log(`[Models API] Fetching models for ${providerId} from ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `[Models API] Failed to fetch: ${response.status}`,
        errorText
      );
      return NextResponse.json(
        {
          error: `Failed to fetch models: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const models = parseModels(data, catalog.responseParser || 'openai');
    const uniqueModels = [...new Set(models)];

    console.log(
      `[Models API] Found ${uniqueModels.length} models for ${providerId}`
    );

    return NextResponse.json({ models: uniqueModels });
  } catch (error) {
    console.error('[Models API] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}
