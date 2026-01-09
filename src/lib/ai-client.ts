/**
 * AI SDK Client
 * 客户端调用统一翻译 API
 */

import { TranslationError, ErrorType } from './engine/errors';

interface TranslateOptions {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    signal?: AbortSignal;
}

interface TranslateResult {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

interface ErrorResponse {
    error: {
        type: string;
        message: string;
        requestId?: string;
    };
}

/**
 * 调用统一翻译 API
 */
export async function translate(options: TranslateOptions): Promise<TranslateResult> {
    const { provider, model, apiKey, baseUrl, messages, temperature, signal } = options;

    let response: Response;
    try {
        response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                model,
                apiKey,
                baseUrl,
                messages,
                temperature,
            }),
            signal,
        });
    } catch (e) {
        if ((e as Error).name === 'AbortError') {
            throw new TranslationError('Translation cancelled', ErrorType.CANCELLED);
        }
        throw new TranslationError((e as Error).message, ErrorType.NETWORK);
    }

    const data = await response.json();

    if (!response.ok) {
        const errorData = data as ErrorResponse;
        const errorType = mapErrorType(errorData.error?.type);
        throw new TranslationError(
            errorData.error?.message || `HTTP ${response.status}`,
            errorType,
            { statusCode: response.status, requestId: errorData.error?.requestId }
        );
    }

    return data as TranslateResult;
}

function mapErrorType(type?: string): ErrorType {
    switch (type) {
        case 'AUTH': return ErrorType.AUTH;
        case 'RATE_LIMIT': return ErrorType.RATE_LIMIT;
        case 'QUOTA': return ErrorType.QUOTA;
        case 'NETWORK': return ErrorType.NETWORK;
        default: return ErrorType.UNKNOWN;
    }
}
