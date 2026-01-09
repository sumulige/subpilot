# Translation Engine Skill

> 翻译引擎核心逻辑，用于维护 `batcher.ts` 和相关翻译流程。

## 核心概念

### Smart Batching
将字幕行分组为批次，减少 API 调用次数。

**关键参数：**
- `maxLinesPerBatch`: 每批最大行数
- `maxCharsPerBatch`: 每批最大字符数
- `lineSeparator`: 行分隔符 (`\n%%\n`)

### Concurrency Control
使用 Token Bucket 模式控制并发请求数。

**关键函数：**
- `createLimiter(concurrency)`: 创建并发限制器
- `createRateLimiter(rps)`: 创建速率限制器

### Context Injection
为每个批次注入上下文，提高翻译连贯性。

**上下文类型：**
- `before`: 前 N 行的译文
- `after`: 后 N 行的原文
- `research`: TACTIC-Lite 分析结果

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/lib/engine/batcher.ts` | 核心批处理逻辑 |
| `src/lib/engine/cache.ts` | IndexedDB 缓存 |
| `src/lib/engine/translator.ts` | 高层翻译协调器 |
| `src/lib/engine/errors.ts` | 错误类型定义 |

## 常见修改场景

### 调整批次大小
修改 `DEFAULT_CONFIG.maxLinesPerBatch`

### 调整并发数
修改 `DEFAULT_CONFIG.concurrency` 或 provider 的 `rateLimit.maxConcurrency`

### 修改提示词模板
修改 `SYSTEM_PROMPT` 或 `DEFAULT_USER_PROMPT`

## 注意事项

1. `getEffectiveConfig()` 会过滤 `undefined` 值，避免覆盖默认配置
2. 缓存 Key 由 `文本 + 提供商 + 语言对` 生成
3. 翻译结果通过 `%%` 分隔符拆分回各行
