/**
 * Enhanced Proxy API Route
 * 增强的代理 API，支持详细错误分类和请求追踪
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Configuration
// ============================================================================

const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 60000; // 60 秒
const RETRY_DELAY = 1000;

// 允许的 API 主机
const ALLOWED_HOSTS = [
    'integrate.api.nvidia.com',
    'api.nvidia.com',
    'api.openai.com',
    'api.deepseek.com',
    'api.deepl.com',
    'api-free.deepl.com',
    'translation.googleapis.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'openrouter.ai',
    'api.deepinfra.com',
    'dashscope.aliyuncs.com',
    'ark.cn-beijing.volces.com',
];

// ============================================================================
// Error Types
// ============================================================================

interface ProxyError {
    type: 'NETWORK' | 'RATE_LIMIT' | 'AUTH' | 'QUOTA' | 'PARSE' | 'FORBIDDEN' | 'UNKNOWN';
    message: string;
    statusCode?: number;
    retryAfter?: number;
    requestId?: string;
}

function classifyError(statusCode: number, body?: unknown): ProxyError['type'] {
    if (statusCode === 429) return 'RATE_LIMIT';
    if (statusCode === 401 || statusCode === 403) return 'AUTH';
    if (statusCode === 402) return 'QUOTA';
    if (statusCode >= 500) return 'NETWORK';

    // 检查响应体中的错误信息
    if (body && typeof body === 'object') {
        const errorMessage = JSON.stringify(body).toLowerCase();
        if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
            return 'QUOTA';
        }
        if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
            return 'RATE_LIMIT';
        }
    }

    return 'UNKNOWN';
}

// ============================================================================
// Request Handling
// ============================================================================

/** 生成请求 ID */
function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/** 带重试的 fetch */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    config: { retries: number; timeout: number; requestId: string }
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            // 如果是速率限制，检查 Retry-After
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                if (retryAfter && attempt < config.retries) {
                    const waitTime = parseInt(retryAfter, 10) * 1000 || RETRY_DELAY * (attempt + 1);
                    console.warn(`[${config.requestId}] Rate limited, waiting ${waitTime}ms`);
                    await new Promise((r) => setTimeout(r, Math.min(waitTime, 30000)));
                    continue;
                }
            }

            // 如果是服务器错误，重试
            if (response.status >= 500 && attempt < config.retries) {
                console.warn(`[${config.requestId}] Server error ${response.status}, retrying...`);
                await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error as Error;
            console.warn(`[${config.requestId}] Attempt ${attempt + 1} failed:`, (error as Error).message);

            if (attempt < config.retries) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
            }
        }
    }

    throw lastError ?? new Error('Request failed after retries');
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { url, headers = {}, payload, timeout = DEFAULT_TIMEOUT } = body as {
            url: string;
            headers?: Record<string, string>;
            payload: unknown;
            timeout?: number;
        };

        // 验证 URL
        let urlObj: URL;
        try {
            urlObj = new URL(url);
        } catch {
            return NextResponse.json(
                {
                    error: { type: 'PARSE', message: 'Invalid URL', requestId },
                },
                { status: 400 }
            );
        }

        // 检查主机是否允许
        if (!ALLOWED_HOSTS.some((host) => urlObj.hostname.includes(host))) {
            return NextResponse.json(
                {
                    error: {
                        type: 'FORBIDDEN',
                        message: `Host not allowed: ${urlObj.hostname}`,
                        requestId,
                    },
                },
                { status: 403 }
            );
        }

        console.log(`[${requestId}] Proxying to ${urlObj.hostname}`);
        console.log(`[${requestId}] Request Payload:`, JSON.stringify(payload, null, 2));

        // 转发请求
        const response = await fetchWithRetry(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // Use generic UA to avoid WAF blocking (Doubao/VolcEngine is sensitive)
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ...headers,
                },
                body: JSON.stringify(payload),
            },
            { retries: MAX_RETRIES, timeout, requestId }
        );

        // 解析响应
        const contentType = response.headers.get('content-type') || '';
        let data: unknown;

        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                console.error(`[${requestId}] JSON Parse Error:`, e);
                return NextResponse.json(
                    {
                        error: {
                            type: 'PARSE',
                            message: 'Failed to parse JSON response',
                            requestId,
                        },
                    },
                    { status: 502 }
                );
            }
        } else {
            const text = await response.text();
            console.log(`[${requestId}] Non-JSON Response:`, text.slice(0, 500));
            data = { text };
        }

        // 处理错误响应
        if (!response.ok) {
            const errorType = classifyError(response.status, data);
            const retryAfter = response.headers.get('Retry-After');

            const proxyError: ProxyError = {
                type: errorType,
                message: extractErrorMessage(data) || `HTTP ${response.status}`,
                statusCode: response.status,
                retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
                requestId,
            };

            console.warn(`[${requestId}] Error Response Body:`, JSON.stringify(data, null, 2));
            console.warn(`[${requestId}] Constructed Error:`, proxyError);

            return NextResponse.json(
                { error: proxyError, data },
                { status: response.status }
            );
        }

        // 成功响应
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] Success in ${duration}ms`);
        // 只有 debug 模式下才打印完整响应，避免日志爆炸？
        // 既然用户要求核心日志，我们就打印出来，但截断过长的内容
        const responseStr = JSON.stringify(data, null, 2);
        console.log(`[${requestId}] Response Data:`, responseStr.length > 2000 ? responseStr.slice(0, 2000) + '...' : responseStr);

        return NextResponse.json(data, {
            headers: {
                'X-Request-Id': requestId,
                'X-Response-Time': `${duration}ms`,
            },
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${requestId}] Proxy error after ${duration}ms:`, error);

        // 分类错误
        const message = (error as Error).message || 'Unknown error';
        let errorType: ProxyError['type'] = 'UNKNOWN';

        if (message.includes('abort') || message.includes('timeout')) {
            errorType = 'NETWORK';
        } else if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
            errorType = 'NETWORK';
        }

        return NextResponse.json(
            {
                error: {
                    type: errorType,
                    message,
                    requestId,
                },
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// Helpers
// ============================================================================

function extractErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;

    const obj = data as Record<string, unknown>;

    // 常见的错误消息字段
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (obj.error && typeof obj.error === 'object') {
        const err = obj.error as Record<string, unknown>;
        if (typeof err.message === 'string') return err.message;
    }

    return null;
}

// ============================================================================
// OPTIONS Handler (CORS Preflight)
// ============================================================================

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}
