/**
 * Doubao (VolcEngine) Provider - AI SDK 版本
 */

import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const doubaoSchema: ProviderSchema = {
    id: 'doubao',
    name: 'Doubao (VolcEngine)',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: {
            type: 'string',
            label: 'Endpoint / Model ID',
            placeholder: 'ep-2024xxxxxxxx or doubao-pro-32k',
            required: true,
        },
        baseUrl: {
            type: 'string',
            label: 'Base URL',
            placeholder: 'https://ark.cn-beijing.volces.com/api/v3',
        },
    },
    // VolcEngine: doubao-seed 模型批次不宜太大，否则返回 500
    rateLimit: {
        maxConcurrency: 50,       // 30k RPM 允许极高并发
        maxRequestsPerMinute: 30000,
        recommendedBatchSize: 5,  // 小批次 + 高并发 = 最快速度
        recommendedTemperature: 0.3,
    },
};

class DoubaoProvider implements Provider {
    readonly id = 'doubao';
    readonly name = 'Doubao (VolcEngine)';
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
            provider: 'doubao',
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

export function createDoubaoProvider(config: ProviderConfig): Provider {
    return new DoubaoProvider({
        apiKey: config.apiKey as string,
        model: config.model as string,
        baseUrl: config.baseUrl as string,
    });
}

registerProvider(doubaoSchema, createDoubaoProvider);
