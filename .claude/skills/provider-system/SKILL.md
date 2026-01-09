# Provider System Skill

> AI 服务提供商系统，用于添加新的翻译服务或调整现有服务。

## 架构模式

使用 **Registry Pattern**：所有 Provider 实现统一的 `Provider` 接口，通过 Registry 注册和获取。

```typescript
interface Provider {
    id: string;
    name: string;
    type: 'api' | 'llm';
    translate(req: TranslationRequest): Promise<TranslationResult>;
}
```

## 添加新 Provider 步骤

### 1. 创建 Provider 文件
```bash
# 创建 src/lib/providers/new-provider.ts
```

### 2. 定义 Schema
```typescript
export const newProviderSchema: ProviderSchema = {
    id: 'new-provider',
    name: 'Provider Name',
    type: 'llm',
    fields: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        model: { type: 'string', label: 'Model', required: true },
        baseUrl: { type: 'string', label: 'Base URL' },
    },
    rateLimit: {
        maxConcurrency: 10,
        maxRequestsPerMinute: 500,
        recommendedBatchSize: 10,
        recommendedTemperature: 0.3,
    },
};
```

### 3. 实现 Provider 类
```typescript
class NewProvider implements Provider {
    async translate(req: TranslationRequest): Promise<TranslationResult> {
        // 调用 translate() from ai-client.ts
    }
}
```

### 4. 注册 Provider
```typescript
registerProvider(newProviderSchema, createNewProvider);
```

### 5. 添加 API Route Case
在 `src/app/api/translate/route.ts` 的 `createModel()` 中添加：
```typescript
case 'new-provider':
    return createOpenAICompatible({...}).chatModel(model);
```

### 6. 导出 Provider
在 `src/lib/providers/index.ts` 中添加 import。

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/lib/providers/registry.ts` | Provider 注册表 |
| `src/lib/providers/*.ts` | 各 Provider 实现 |
| `src/app/api/translate/route.ts` | API 代理 |
| `src/lib/ai-client.ts` | 客户端 API 调用 |

## 特殊处理

### Doubao (VolcEngine)
- 需要 Endpoint ID (`ep-...`) 或 Model ID
- Base URL 自动清理 `/chat/completions` 后缀
- Seed 模型 QPS 较低，注意并发设置

### Rate Limit 配置
- `maxConcurrency`: 最大并发请求数
- `maxRequestsPerMinute`: RPM 限制
- `recommendedBatchSize`: 建议批次大小
