/**
 * OpenAI Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const openaiSchema: ProviderSchema = {
    id: 'openai',
    name: 'OpenAI',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'select',
            label: 'Model',
            options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            default: 'gpt-4o-mini',
        },
        baseUrl: { type: 'string', label: 'Base URL (可选)', placeholder: 'https://api.openai.com/v1' },
    },
    rateLimit: {
        maxConcurrency: 20,
        maxRequestsPerMinute: 500,
        recommendedBatchSize: 15,
        recommendedTemperature: 0.3,
    },
};

class OpenAIProvider implements Provider {
    readonly id = 'openai';
    readonly name = 'OpenAI';
    readonly type = 'llm' as const;

    constructor(private config: {
        apiKey: string;
        model: string;
        baseUrl?: string;
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
            provider: 'openai',
            model: this.config.model,
            apiKey: this.config.apiKey,
            baseUrl: this.config.baseUrl,
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

export function createOpenAIProvider(config: ProviderConfig): Provider {
    return new OpenAIProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'gpt-4o-mini',
        baseUrl: config.baseUrl as string,
    });
}

registerProvider(openaiSchema, createOpenAIProvider);
