/**
 * DeepInfra Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const deepinfraSchema: ProviderSchema = {
    id: 'deepinfra',
    name: 'DeepInfra',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'string',
            label: 'Model',
            placeholder: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
            default: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        },
    },
    rateLimit: {
        maxConcurrency: 20,
        maxRequestsPerMinute: 200,
        recommendedBatchSize: 15,
        recommendedTemperature: 0.3,
    },
};

class DeepInfraProvider implements Provider {
    readonly id = 'deepinfra';
    readonly name = 'DeepInfra';
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
            provider: 'deepinfra',
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

export function createDeepInfraProvider(config: ProviderConfig): Provider {
    return new DeepInfraProvider({
        apiKey: config.apiKey as string,
        model: (config.model as string) || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    });
}

registerProvider(deepinfraSchema, createDeepInfraProvider);
