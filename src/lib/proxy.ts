/**
 * Proxy Fetch
 * 通过代理发送请求，绕过 CORS
 */

import { TranslationError, ErrorType, createTranslationError } from './engine/errors';

interface ProxyFetchOptions {
    url: string;
    headers?: Record<string, string>;
    body: unknown;
    signal?: AbortSignal;
    timeout?: number;
}

interface ProxyErrorResponse {
    error: {
        type: string;
        message: string;
        statusCode?: number;
        retryAfter?: number;
        requestId?: string;
    };
    data?: unknown;
}

export async function proxyFetch<T>(options: ProxyFetchOptions): Promise<T> {
    const { url, headers, body, signal, timeout } = options;

    // Client-side logging
    console.log(`[ProxyFetch] Request to ${url}`, { body, headers });

    let response: Response;
    try {
        response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                headers: headers || {},
                payload: body,
                timeout, // 传递超时设置给代理
            }),
            signal,
        });
    } catch (e) {
        console.error(`[ProxyFetch] Network Error:`, e);
        // fetch 自身失败（如网络断开）
        throw createTranslationError(e as Error);
    }

    // 解析响应
    const contentType = response.headers.get('content-type') || '';
    let data: unknown;

    try {
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { text };
        }
        console.log(`[ProxyFetch] Response from ${url}:`, { status: response.status, data });
    } catch (e) {
        console.error(`[ProxyFetch] Parse Error:`, e);
        throw new TranslationError(
            'Failed to parse proxy response',
            ErrorType.PARSE,
            { originalError: e as Error }
        );
    }

    // 处理错误
    if (!response.ok) {
        const errorBody = data as ProxyErrorResponse;

        if (errorBody?.error) {
            // 使用代理返回的结构化错误
            const { type, message, statusCode, retryAfter, requestId } = errorBody.error;

            // 映射错误类型
            let errorType: ErrorType;
            switch (type) {
                case 'RATE_LIMIT': errorType = ErrorType.RATE_LIMIT; break;
                case 'AUTH': errorType = ErrorType.AUTH; break;
                case 'QUOTA': errorType = ErrorType.QUOTA; break;
                case 'NETWORK': errorType = ErrorType.NETWORK; break;
                case 'PARSE': errorType = ErrorType.PARSE; break;
                default: errorType = ErrorType.UNKNOWN;
            }

            throw new TranslationError(message, errorType, {
                statusCode: statusCode || response.status,
                retryAfter,
                requestId,
            });
        }

        // 回退错误处理
        throw createTranslationError(
            JSON.stringify(data) || `Proxy error: ${response.status}`,
            response.status
        );
    }

    return data as T;
}
