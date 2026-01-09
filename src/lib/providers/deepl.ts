/**
 * DeepL Provider - 使用专用 API 路由
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { TranslationError, ErrorType } from '../engine/errors';

export const deeplSchema: ProviderSchema = {
    id: 'deepl',
    name: 'DeepL',
    type: 'api',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        useFree: { type: 'boolean', label: 'Use Free API', default: false },
    },
};

interface DeepLApiResponse {
    text?: string;
    error?: { type: string; message: string; requestId?: string };
}

class DeepLProvider implements Provider {
    readonly id = 'deepl';
    readonly name = 'DeepL';
    readonly type = 'api' as const;

    constructor(private config: { apiKey: string; useFree?: boolean }) { }

    async translate(req: TranslationRequest): Promise<TranslationResult> {
        const response = await fetch('/api/deepl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: this.config.apiKey,
                useFree: this.config.useFree,
                text: req.text,
                targetLang: req.target,
                sourceLang: req.source,
                context: req.context,
            }),
            signal: req.signal,
        });

        const data: DeepLApiResponse = await response.json();

        if (!response.ok || data.error) {
            const errorType = data.error?.type === 'AUTH' ? ErrorType.AUTH
                : data.error?.type === 'RATE_LIMIT' ? ErrorType.RATE_LIMIT
                    : data.error?.type === 'QUOTA' ? ErrorType.QUOTA
                        : ErrorType.UNKNOWN;
            throw new TranslationError(data.error?.message || 'DeepL error', errorType);
        }

        return { text: data.text || '' };
    }
}

export function createDeepLProvider(config: ProviderConfig): Provider {
    return new DeepLProvider({
        apiKey: config.apiKey as string,
        useFree: config.useFree as boolean,
    });
}

registerProvider(deeplSchema, createDeepLProvider);
