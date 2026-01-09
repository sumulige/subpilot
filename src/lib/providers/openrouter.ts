/**
 * OpenRouter Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const openrouterSchema: ProviderSchema = {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'string',
            label: 'Model',
            placeholder: 'anthropic/claude-3.5-sonnet',
            default: 'anthropic/claude-3.5-sonnet',
        },
    },
    rateLimit: {
        maxConcurrency: 10,
        maxRequestsPerMinute: 100,
        recommendedBatchSize: 10,
        recommendedTemperature: 0.3,
    },
};

class OpenRouterProvider implements Provider {
    readonly id = 'openrouter';
    readonly name = 'OpenRouter';
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
            provider: 'openrouter',
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

export function createOpenRouterProvider(config: ProviderConfig): Provider {
    return new OpenRouterProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'anthropic/claude-3.5-sonnet',
    });
}

registerProvider(openrouterSchema, createOpenRouterProvider);
