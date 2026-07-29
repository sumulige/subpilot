/**
 * Partition / split / rate-limit 单元测试
 */

import { describe, it, expect } from 'vitest';
import { createBatches, fillBatchContext } from './partition';
import { splitTranslation } from './execute-batch';
import { createLimiter } from './rate-limit';
import type { SubtitleLine } from '../types';

function lines(texts: string[]): SubtitleLine[] {
  return texts.map((text, i) => ({
    index: i + 1,
    start: i * 1000,
    end: (i + 1) * 1000,
    text,
  }));
}

describe('createBatches', () => {
  it('按 maxLinesPerBatch 分片', () => {
    const batches = createBatches(lines(['a', 'b', 'c', 'd', 'e']), {
      maxLinesPerBatch: 2,
      maxCharsPerBatch: 10000,
    });
    expect(batches).toHaveLength(3);
    expect(batches[0].lines).toHaveLength(2);
    expect(batches[2].lines).toHaveLength(1);
  });

  it('mergedText 使用分隔符', () => {
    const batches = createBatches(lines(['Hello', 'World']), {
      maxLinesPerBatch: 10,
      lineSeparator: '\n%%\n',
    });
    expect(batches[0].mergedText).toBe('Hello\n%%\nWorld');
  });
});

describe('fillBatchContext', () => {
  it('后文取下一批原文；前文在无译文时取上批原文', () => {
    const batches = createBatches(lines(['a1', 'a2', 'b1', 'b2']), {
      maxLinesPerBatch: 2,
      contextLines: 1,
    });
    fillBatchContext(batches, { contextLines: 1 });
    expect(batches[0].context.after).toBe('b1');
    expect(batches[1].context.before).toBe('a2');
  });

  it('前文优先用上批译文', () => {
    const batches = createBatches(lines(['a1', 'a2', 'b1']), {
      maxLinesPerBatch: 2,
      contextLines: 1,
    });
    batches[0].translations = ['译1', '译2'];
    fillBatchContext(batches, { contextLines: 1 });
    expect(batches[1].context.before).toBe('译2');
  });
});

describe('splitTranslation', () => {
  it('分隔符匹配时按行返回', () => {
    expect(splitTranslation('一\n%%\n二\n%%\n三', 3, '\n%%\n')).toEqual([
      '一',
      '二',
      '三',
    ]);
  });

  it('行数不足时补空串', () => {
    expect(splitTranslation('only', 3, '\n%%\n')).toEqual(['only', '', '']);
  });

  it('行数过多时截断', () => {
    expect(splitTranslation('a\n%%\nb\n%%\nc\n%%\nd', 2, '\n%%\n')).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('createLimiter', () => {
  it('并发不超过上限', async () => {
    let peak = 0;
    let active = 0;
    const limit = createLimiter(2);

    await Promise.all(
      Array.from({ length: 6 }, () =>
        limit(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((r) => setTimeout(r, 20));
          active--;
        })
      )
    );

    expect(peak).toBeLessThanOrEqual(2);
  });
});
