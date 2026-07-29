/**
 * CacheKey 组装：含 glossaryHash，避免术语变更串缓存
 */

import type { GlossaryItem } from '@/lib/engine/glossary';

/** 稳定字符串哈希（与 cache.key 同源算法） */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/** 术语表指纹；空表为 '0' */
export function glossaryHash(
  glossary?: GlossaryItem[] | string | null
): string {
  if (!glossary) return '0';
  if (typeof glossary === 'string') {
    const trimmed = glossary.trim();
    return trimmed ? hashString(trimmed) : '0';
  }
  if (glossary.length === 0) return '0';
  const normalized = glossary
    .map((g) => `${g.term}=${g.translation}`)
    .sort()
    .join('\n');
  return hashString(normalized);
}

export interface CacheSuffixParts {
  providerId: string;
  source: string;
  target: string;
  /** std | tactic */
  mode?: string;
  glossaryHash?: string;
  temperature?: number;
  /** prompt 模板版本，改提示词时 bump */
  promptVer?: string;
}

/**
 * 缓存后缀：provider:langs:mode:glossaryHash:temp:promptVer
 */
export function buildCacheSuffix(parts: CacheSuffixParts): string {
  return [
    parts.providerId,
    parts.source,
    parts.target,
    parts.mode ?? 'std',
    parts.glossaryHash ?? '0',
    String(parts.temperature ?? 0),
    parts.promptVer ?? 'v1',
  ].join(':');
}
