/**
 * DeepSeek Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const deepseekSchema: ProviderSchema = {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'select',
            label: 'Model',
            options: ['deepseek-chat', 'deepseek-reasoner'],
            default: 'deepseek-chat',
        },
    },
    rateLimit: {
        maxConcurrency: 20,
        maxRequestsPerMinute: 300,
        recommendedBatchSize: 15,
        recommendedTemperature: 0.3,
    },
};

class DeepSeekProvider implements Provider {
    readonly id = 'deepseek';
    readonly name = 'DeepSeek';
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
            provider: 'deepseek',
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

export function createDeepSeekProvider(config: ProviderConfig): Provider {
    return new DeepSeekProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'deepseek-chat',
    });
}

registerProvider(deepseekSchema, createDeepSeekProvider);
