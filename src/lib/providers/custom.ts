/**
 * Custom LLM Provider - AI SDK 版本
 * 支持任意 OpenAI 兼容的 API
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const customLLMSchema: ProviderSchema = {
    id: 'custom',
    name: 'Custom (OpenAI Compatible)',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: { type: 'string', label: 'Model', required: true, placeholder: 'gpt-4' },
        baseUrl: { type: 'string', label: 'Base URL', required: true, placeholder: 'https://your-api.com/v1' },
    },
};

class CustomProvider implements Provider {
    readonly id = 'custom';
    readonly name = 'Custom';
    readonly type = 'llm' as const;

    constructor(private config: {
        apiKey: string;
        model: string;
        baseUrl: string;
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
            provider: 'custom',
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

export function createCustomProvider(config: ProviderConfig): Provider {
    return new CustomProvider({
        apiKey: config.apiKey as string,
        model: config.model as string,
        baseUrl: config.baseUrl as string,
    });
}

registerProvider(customLLMSchema, createCustomProvider);
