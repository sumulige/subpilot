/**
 * NVIDIA NIM Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const nvidiaSchema: ProviderSchema = {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'select',
            label: 'Model',
            options: [
                'meta/llama-3.1-405b-instruct',
                'meta/llama-3.1-70b-instruct',
                'nvidia/llama-3.1-nemotron-70b-instruct',
                'qwen/qwen2.5-72b-instruct',
            ],
            default: 'meta/llama-3.1-70b-instruct',
        },
    },
    rateLimit: {
        maxConcurrency: 10,
        maxRequestsPerMinute: 100,
        recommendedBatchSize: 10,
        recommendedTemperature: 0.3,
    },
};

class NvidiaProvider implements Provider {
    readonly id = 'nvidia';
    readonly name = 'NVIDIA NIM';
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
            provider: 'nvidia',
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

export function createNvidiaProvider(config: ProviderConfig): Provider {
    return new NvidiaProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'meta/llama-3.1-70b-instruct',
    });
}

registerProvider(nvidiaSchema, createNvidiaProvider);
