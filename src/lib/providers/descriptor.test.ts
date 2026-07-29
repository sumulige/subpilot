/**
 * ProviderDescriptor / catalog 一致性测试
 */

import { describe, it, expect } from 'vitest';
import '@/lib/providers';
import { registry } from './registry';
import { normalizeCompatibleBaseUrl } from './sdk-adapter';
import { parseModels } from '@/app/api/models/route';
import { openaiDescriptor } from './openai';
import { doubaoDescriptor } from './doubao';
import { deeplDescriptor } from './deepl';
import { customDescriptor } from './custom';

describe('ProviderDescriptor catalog', () => {
  it('所有已注册 provider 都有 schema + factory', () => {
    const list = registry.listDescriptors();
    expect(list.length).toBeGreaterThanOrEqual(10);
    for (const d of list) {
      expect(d.schema.id).toBeTruthy();
      expect(typeof d.factory).toBe('function');
    }
  });

  it('LLM 有 sdk；DeepL 无 sdk', () => {
    expect(openaiDescriptor.sdk?.kind).toBe('ai-sdk-openai');
    expect(doubaoDescriptor.sdk?.kind).toBe('openai-compatible');
    expect(deeplDescriptor.sdk).toBeUndefined();
  });

  it('modelsCatalog 与 supportsModelFetch 一致', () => {
    expect(registry.supportsModelFetch('openai')).toBe(true);
    expect(registry.supportsModelFetch('doubao')).toBe(true);
    expect(registry.supportsModelFetch('deepl')).toBe(false);
    expect(registry.supportsModelFetch('google')).toBe(false);
    expect(registry.supportsModelFetch('custom')).toBe(false);
  });

  it('custom 无 defaultBaseUrl，强制用户填写', () => {
    expect(customDescriptor.sdk?.kind).toBe('openai-compatible');
    if (customDescriptor.sdk?.kind === 'openai-compatible') {
      expect(customDescriptor.sdk.defaultBaseUrl).toBeUndefined();
    }
  });

  it('doubao normalizeBaseUrl 去掉 chat/completions', () => {
    expect(
      normalizeCompatibleBaseUrl(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
      )
    ).toBe('https://ark.cn-beijing.volces.com/api/v3');
  });
});

describe('parseModels', () => {
  it('解析 OpenAI 风格', () => {
    const ids = parseModels(
      { data: [{ id: 'b' }, { id: 'a' }] },
      'openai'
    );
    expect(ids).toEqual(['a', 'b']);
  });

  it('解析 Doubao 风格并过滤 offline', () => {
    const ids = parseModels(
      {
        code: 0,
        data: [
          { id: 'ep-1', status: 'online' },
          { id: 'ep-2', status: 'offline' },
        ],
      },
      'doubao'
    );
    expect(ids).toEqual(['ep-1']);
  });
});
