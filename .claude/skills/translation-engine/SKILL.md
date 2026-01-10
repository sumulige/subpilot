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

### Glossary (术语表)
RAG-Lite 术语检索，自动匹配并注入相关术语到提示词。

**支持格式：** `Term=Translation`、CSV、JSON

### Session Recovery (会话恢复)
断点续翻功能，翻译中断后可恢复进度。

**核心函数：**
- `createSession()`: 创建翻译会话
- `addCompletedBatch()`: 保存已完成批次
- `getSession()`: 恢复会话

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/lib/engine/batcher.ts` | 核心批处理逻辑 |
| `src/lib/engine/translator.ts` | 高层翻译协调器 |
| `src/lib/engine/cache.ts` | IndexedDB 缓存 |
| `src/lib/engine/glossary.ts` | 术语表解析与检索 |
| `src/lib/engine/prompts.ts` | 提示词模板管理 |
| `src/lib/engine/quality-evaluator.ts` | 翻译质量评估 |
| `src/lib/engine/translation-session.ts` | 会话恢复/断点续翻 |
| `src/lib/engine/errors.ts` | 错误类型定义 |

## 常见修改场景

### 调整批次大小
修改 `DEFAULT_CONFIG.maxLinesPerBatch`

### 调整并发数
修改 `DEFAULT_CONFIG.concurrency` 或 provider 的 `rateLimit.maxConcurrency`

### 修改提示词模板
修改 `prompts.ts` 中的 `SYSTEM_PROMPT` 或 `DEFAULT_USER_PROMPT`

### 添加术语表支持
使用 `parseGlossary()` 解析用户输入，`retrieveGlossaryMatches()` 检索匹配项

## 注意事项

1. `getEffectiveConfig()` 会过滤 `undefined` 值，避免覆盖默认配置
2. 缓存 Key 由 `文本 + 提供商 + 语言对` 生成
3. 翻译结果通过 `%%` 分隔符拆分回各行
4. 会话数据存储在 `localStorage`，大文件请使用 IndexedDB

