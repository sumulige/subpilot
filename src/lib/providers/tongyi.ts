/**
 * Tongyi (Aliyun DashScope) Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const tongyiSchema: ProviderSchema = {
    id: 'tongyi',
    name: 'Tongyi (阿里通义)',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'select',
            label: 'Model',
            options: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
            default: 'qwen-turbo',
        },
        baseUrl: {
            type: 'string',
            label: 'Base URL',
            placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        },
    },
    rateLimit: {
        maxConcurrency: 30,
        maxRequestsPerMinute: 300,
        recommendedBatchSize: 15,
        recommendedTemperature: 0.3,
    },
};

class TongyiProvider implements Provider {
    readonly id = 'tongyi';
    readonly name = 'Tongyi (阿里通义)';
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
            provider: 'tongyi',
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

export function createTongyiProvider(config: ProviderConfig): Provider {
    return new TongyiProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'qwen-turbo',
        baseUrl: config.baseUrl as string,
    });
}

registerProvider(tongyiSchema, createTongyiProvider);
