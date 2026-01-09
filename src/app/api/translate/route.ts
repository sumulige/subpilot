/**
 * Unified Translation API Route
 * 使用 Vercel AI SDK 统一调用各翻译服务商
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// ============================================================================
// Types
// ============================================================================

interface TranslateRequest {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
}

// ============================================================================
// Provider Factory
// ============================================================================

function createModel(provider: string, model: string, apiKey: string, baseUrl?: string) {
    switch (provider) {
        case 'openai':
            return createOpenAI({
                apiKey,
                baseURL: baseUrl,
            })(model);

        case 'deepseek':
            return createDeepSeek({ apiKey })(model);

        case 'google':
            return createGoogleGenerativeAI({ apiKey })(model);

        // OpenAI 兼容服务商 - 使用 openai-compatible 包
        case 'doubao':
            return createOpenAICompatible({
                name: 'doubao',
                apiKey,
                baseURL: (baseUrl || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/chat\/completions\/?$/, '').replace(/\/$/, ''),
            }).chatModel(model);

        case 'tongyi':
            return createOpenAICompatible({
                name: 'tongyi',
                apiKey,
                baseURL: baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            }).chatModel(model);

        case 'deepinfra':
            return createOpenAICompatible({
                name: 'deepinfra',
                apiKey,
                baseURL: baseUrl || 'https://api.deepinfra.com/v1/openai',
            }).chatModel(model);

        case 'openrouter':
            return createOpenAICompatible({
                name: 'openrouter',
                apiKey,
                baseURL: baseUrl || 'https://openrouter.ai/api/v1',
            }).chatModel(model);

        case 'nvidia':
            return createOpenAICompatible({
                name: 'nvidia',
                apiKey,
                baseURL: baseUrl || 'https://integrate.api.nvidia.com/v1',
            }).chatModel(model);

        case 'custom':
            if (!baseUrl) throw new Error('Custom provider requires baseUrl');
            return createOpenAICompatible({
                name: 'custom',
                apiKey,
                baseURL: baseUrl,
            }).chatModel(model);

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
    const requestId = `translate_${Date.now().toString(36)}`;
    const startTime = Date.now();

    try {
        const body: TranslateRequest = await request.json();
        const { provider, model, apiKey, baseUrl, messages, temperature = 0.3 } = body;

        console.log(`[${requestId}] Translating with ${provider}/${model}`);
        console.log(`[${requestId}] Messages:`, JSON.stringify(messages, null, 2));

        // 创建模型实例
        const modelInstance = createModel(provider, model, apiKey, baseUrl);

        // 调用 AI SDK
        const result = await generateText({
            model: modelInstance,
            messages,
            temperature,
        });

        const duration = Date.now() - startTime;
        console.log(`[${requestId}] Success in ${duration}ms`);

        return NextResponse.json({
            text: result.text,
            usage: result.usage,
        }, {
            headers: {
                'X-Request-Id': requestId,
                'X-Response-Time': `${duration}ms`,
            },
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown error';

        console.error(`[${requestId}] Error after ${duration}ms:`, message);

        // 分类错误
        let statusCode = 500;
        let errorType = 'UNKNOWN';

        if (message.includes('401') || message.includes('auth') || message.includes('key')) {
            statusCode = 401;
            errorType = 'AUTH';
        } else if (message.includes('429') || message.includes('rate')) {
            statusCode = 429;
            errorType = 'RATE_LIMIT';
        } else if (message.includes('quota') || message.includes('insufficient')) {
            statusCode = 402;
            errorType = 'QUOTA';
        }

        return NextResponse.json({
            error: {
                type: errorType,
                message,
                requestId,
            },
        }, { status: statusCode });
    }
}
