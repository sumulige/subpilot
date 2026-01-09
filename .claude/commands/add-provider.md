# Add Provider Command

使用此命令添加新的 AI 翻译服务商。

## 使用方法

```
/add-provider <provider-name>
```

## 执行步骤

1. 创建 `src/lib/providers/<provider-name>.ts`
2. 定义 `ProviderSchema` 包含：
   - `id`: Provider 唯一标识
   - `name`: 显示名称
   - `fields`: UI 配置字段 (apiKey, model, baseUrl 等)
   - `rateLimit`: 速率限制配置
3. 实现 `Provider` 类
4. 调用 `registerProvider()` 注册
5. 在 `src/app/api/translate/route.ts` 添加 case
6. 在 `src/lib/providers/index.ts` 导出

## 模板

```typescript
import type { Provider, ProviderSchema, ProviderConfig, TranslationRequest, TranslationResult } from '../types';
import { registerProvider } from './registry';
import { translate } from '../ai-client';

export const {{name}}Schema: ProviderSchema = {
    id: '{{id}}',
    name: '{{displayName}}',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: { type: 'string', label: 'Model', required: true },
    },
    rateLimit: {
        maxConcurrency: 10,
        maxRequestsPerMinute: 500,
        recommendedBatchSize: 10,
        recommendedTemperature: 0.3,
    },
};

class {{ClassName}}Provider implements Provider {
    readonly id = '{{id}}';
    readonly name = '{{displayName}}';
    readonly type = 'llm' as const;

    constructor(private config: { apiKey: string; model: string }) {}

    async translate(req: TranslationRequest): Promise<TranslationResult> {
        const result = await translate({
            provider: '{{id}}',
            model: this.config.model,
            apiKey: this.config.apiKey,
            messages: [
                { role: 'system', content: req.systemPrompt || `Translate to ${req.target}.` },
                { role: 'user', content: req.text },
            ],
            temperature: req.temperature ?? 0.3,
            signal: req.signal,
        });
        return { text: result.text.trim() };
    }
}

export function create{{ClassName}}Provider(config: ProviderConfig): Provider {
    return new {{ClassName}}Provider({
        apiKey: config.apiKey as string,
        model: config.model as string,
    });
}

registerProvider({{name}}Schema, create{{ClassName}}Provider);
```

## 参考

- 参考 `src/lib/providers/doubao.ts` 的实现
- 查看 `.claude/skills/provider-system/SKILL.md` 了解详细架构
