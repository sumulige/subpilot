/**
 * Models API Route
 * Fetches available models from provider APIs (server-side, no CORS)
 * Supports provider-specific endpoints (Doubao uses v3, others use v1)
 */

import { NextRequest, NextResponse } from 'next/server';

// Provider configurations with base URLs and API versions
interface ProviderConfig {
    baseUrl: string;
    modelsPath: string;  // Full path after baseUrl
    responseParser?: 'openai' | 'doubao';  // Different response formats
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    nvidia: {
        baseUrl: 'https://integrate.api.nvidia.com',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    openai: {
        baseUrl: 'https://api.openai.com',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    deepseek: {
        baseUrl: 'https://api.deepseek.com',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    deepinfra: {
        baseUrl: 'https://api.deepinfra.com',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    tongyi: {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
        modelsPath: '/v1/models',
        responseParser: 'openai',
    },
    doubao: {
        baseUrl: 'https://ark.cn-beijing.volces.com',
        modelsPath: '/api/v3/models',  // Doubao uses v3 API
        responseParser: 'doubao',
    },
};

// OpenAI-style response
interface OpenAIModelsResponse {
    data: Array<{ id: string; object?: string; owned_by?: string }>;
    object?: string;
}

// Doubao-style response
interface DoubaoModelsResponse {
    code?: number;
    data: Array<{ id: string; name?: string; status?: string }>;
    message?: string;
}

function parseModels(
    data: unknown,
    parser: 'openai' | 'doubao'
): string[] {
    if (parser === 'doubao') {
        const doubaoData = data as DoubaoModelsResponse;
        if (doubaoData.code !== undefined && doubaoData.code !== 0) {
            console.warn('[Models API] Doubao API error:', doubaoData.message);
            return [];
        }
        return (doubaoData.data || [])
            .filter((m) => m.status === 'online' || !m.status)  // Only online models
            .map((m) => m.id)
            .filter((id) => id && typeof id === 'string')
            .sort();
    }

    // OpenAI-style
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

        const config = PROVIDER_CONFIGS[providerId];
        if (!config) {
            return NextResponse.json(
                { error: `Unknown provider: ${providerId}` },
                { status: 400 }
            );
        }

        const url = `${config.baseUrl}${config.modelsPath}`;
        console.log(`[Models API] Fetching models for ${providerId} from ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000), // 15s timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[Models API] Failed to fetch: ${response.status}`, errorText);
            return NextResponse.json(
                { error: `Failed to fetch models: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        const models = parseModels(data, config.responseParser || 'openai');

        // Deduplicate models (some APIs return duplicates)
        const uniqueModels = [...new Set(models)];

        console.log(`[Models API] Found ${uniqueModels.length} models for ${providerId}`);

        return NextResponse.json({ models: uniqueModels });
    } catch (error) {
        console.error('[Models API] Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Unknown error' },
            { status: 500 }
        );
    }
}
