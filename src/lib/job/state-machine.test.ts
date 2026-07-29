/**
 * Job 状态机 + CacheKey 单元测试
 */

import { describe, it, expect } from 'vitest';
import { canTransition } from './state-machine';
import {
  glossaryHash,
  buildCacheSuffix,
  hashString,
} from '@/lib/engine/cache-key';

describe('canTransition', () => {
  it('idle → preparing 合法', () => {
    expect(canTransition('idle', 'preparing')).toBe(true);
  });

  it('running → completed 合法', () => {
    expect(canTransition('running', 'completed')).toBe(true);
  });

  it('idle → completed 非法', () => {
    expect(canTransition('idle', 'completed')).toBe(false);
  });

  it('paused → running 合法（续跑）', () => {
    expect(canTransition('paused', 'running')).toBe(true);
  });

  it('completed → idle 合法（新任务）', () => {
    expect(canTransition('completed', 'idle')).toBe(true);
  });
});

describe('glossaryHash / buildCacheSuffix', () => {
  it('空术语表指纹为 0', () => {
    expect(glossaryHash(null)).toBe('0');
    expect(glossaryHash([])).toBe('0');
    expect(glossaryHash('')).toBe('0');
  });

  it('术语变更产生不同 hash', () => {
    const a = glossaryHash([{ term: 'Foo', translation: '福' }]);
    const b = glossaryHash([{ term: 'Foo', translation: '佛' }]);
    expect(a).not.toBe(b);
  });

  it('顺序无关：同集合同 hash', () => {
    const a = glossaryHash([
      { term: 'A', translation: '甲' },
      { term: 'B', translation: '乙' },
    ]);
    const b = glossaryHash([
      { term: 'B', translation: '乙' },
      { term: 'A', translation: '甲' },
    ]);
    expect(a).toBe(b);
  });

  it('suffix 含 glossaryHash，避免串缓存', () => {
    const g1 = glossaryHash([{ term: 'X', translation: '一' }]);
    const g2 = glossaryHash([{ term: 'X', translation: '二' }]);
    const s1 = buildCacheSuffix({
      providerId: 'openai',
      source: 'en',
      target: 'zh',
      glossaryHash: g1,
      temperature: 0,
    });
    const s2 = buildCacheSuffix({
      providerId: 'openai',
      source: 'en',
      target: 'zh',
      glossaryHash: g2,
      temperature: 0,
    });
    expect(s1).not.toBe(s2);
    expect(s1).toContain(g1);
  });

  it('hashString 稳定', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });
});
