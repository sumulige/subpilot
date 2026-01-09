/**
 * Google Translate Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const googleSchema: ProviderSchema = {
    id: 'google',
    name: 'Google Gemini',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'select',
            label: 'Model',
            options: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'],
            default: 'gemini-2.0-flash-exp',
        },
    },
    rateLimit: {
        maxConcurrency: 15,
        maxRequestsPerMinute: 60,
        recommendedBatchSize: 10,
        recommendedTemperature: 0.3,
    },
};

class GoogleProvider implements Provider {
    readonly id = 'google';
    readonly name = 'Google Gemini';
    readonly type = 'llm' as const;

    constructor(private config: {
        apiKey: string;
        model: string;
    }) { }

    async translate(req: TranslationRequest): Promise<TranslationResult> {
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

        if (req.systemPrompt) {
            messages.push({ role: 'system', content: req.systemPrompt });
        } else {
            messages.push({ role: 'system', content: `Translate from ${req.source} to ${req.target}.` });
        }
        messages.push({ role: 'user', content: req.text });

        const result = await translate({
            provider: 'google',
            model: this.config.model,
            apiKey: this.config.apiKey,
            messages,
            temperature: req.temperature ?? 0.3,
            signal: req.signal,
        });

        return {
            text: result.text.trim(),
            tokens: result.usage ? {
                input: result.usage.promptTokens,
                output: result.usage.completionTokens,
            } : undefined,
        };
    }
}

export function createGoogleProvider(config: ProviderConfig): Provider {
    return new GoogleProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'gemini-2.0-flash-exp',
    });
}

registerProvider(googleSchema, createGoogleProvider);
