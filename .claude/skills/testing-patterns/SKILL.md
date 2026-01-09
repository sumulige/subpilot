# Testing Patterns Skill

> 测试模式和调试技巧。

## 测试框架

使用 **Vitest** 进行单元测试。

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

## 测试文件位置

测试文件与源文件同目录，使用 `.test.ts` 后缀：
- `src/lib/engine/batcher.test.ts`
- `src/lib/parsers/srt.test.ts`

## 常见测试场景

### 测试批次创建
```typescript
import { createBatches } from './batcher';

test('creates correct number of batches', () => {
    const lines = [...]; // 100 lines
    const batches = createBatches(lines, { maxLinesPerBatch: 10 });
    expect(batches).toHaveLength(10);
});
```

### 测试 Parser
```typescript
import { srtParser } from './srt';

test('parses SRT correctly', () => {
    const content = `1\n00:00:00,000 --> 00:00:01,000\nHello`;
    const result = srtParser.parse(content);
    expect(result.lines[0].text).toBe('Hello');
});
```

## 调试技巧

### 启用 Debug 模式
在 `BatcherConfig` 中设置 `debug: true`：
```typescript
const config = { ...DEFAULT_CONFIG, debug: true };
```

### 查看 Console 日志
- `[Batch N] 开始翻译` - 批次开始
- `[Batch N] API 调用耗时` - API 响应时间
- `[Batch N] 完成` - 批次完成

### 检查缓存
在浏览器 DevTools 中：
1. Application → IndexedDB
2. 查找 `subtitle-translator-cache` 数据库
3. 清除缓存以强制重新翻译

## 常见问题

### 翻译结果行数不匹配
检查 `splitTranslation()` 函数的回退策略。

### 双语模式重复原文
检查 `translator.ts` 和 `srt.ts` 是否同时拼接了原文。
