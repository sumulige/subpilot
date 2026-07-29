/**
 * JobService 编排测试（mock provider / store）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationJobService } from './job-service';
import type { JobStorePort } from './ports';
import type { TranslationSession } from '@/lib/engine/translation-session';
import type { Subtitle } from '@/lib/types';

vi.mock('@/lib/providers', () => ({
  registry: {
    get: () => ({
      id: 'mock',
      name: 'Mock',
      type: 'llm',
      translate: vi.fn(async ({ text }: { text: string }) => ({
        text: text
          .split('\n%%\n')
          .map((t: string) => `TR:${t}`)
          .join('\n%%\n'),
      })),
    }),
    list: () => [{ id: 'mock' }],
  },
}));

vi.mock('@/lib/parsers', () => ({
  detectFormat: (name: string) => (name.endsWith('.srt') ? 'srt' : null),
  getParser: () => ({
    parse: (text: string): Subtitle => ({
      format: 'srt',
      lines: text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((t, i) => ({
          index: i + 1,
          start: 0,
          end: 1000,
          text: t,
        })),
    }),
    serialize: (sub: Subtitle) =>
      sub.lines.map((l) => l.translated || l.text).join('\n'),
  }),
}));

function createMemoryStore(): JobStorePort & {
  sessions: TranslationSession[];
} {
  let current: TranslationSession | null = null;
  const store: JobStorePort & { sessions: TranslationSession[] } = {
    sessions: [],
    load: () => current,
    save: (s) => {
      current = s;
    },
    clear: () => {
      current = null;
    },
    create: (files, config) => {
      current = {
        id: 'test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        files,
        fileProgresses: files.map((f, i) => ({
          fileIndex: i,
          fileName: f.name,
          status: 'pending',
          current: 0,
          total: f.lineCount,
        })),
        currentFileIndex: 0,
        completedBatches: {},
        config,
      };
      return current;
    },
    updateFileProgress: (i, p) => {
      if (!current) return;
      current.fileProgresses[i] = { ...current.fileProgresses[i], ...p };
    },
    addCompletedBatch: (i, batch) => {
      if (!current) return;
      if (!current.completedBatches[i]) current.completedBatches[i] = [];
      current.completedBatches[i].push(batch);
    },
    filesToStoredFiles: async (files, lineCounts) =>
      Promise.all(
        files.map(async (f, i) => ({
          name: f.name,
          content: await f.text(),
          lineCount: lineCounts?.[i] ?? 1,
        }))
      ),
    storedFilesToFiles: (stored) =>
      stored.map((f) => new File([f.content], f.name)),
    hasRecoverable: () =>
      !!current?.fileProgresses.some(
        (fp) => fp.status === 'pending' || fp.status === 'translating'
      ),
  };
  return store;
}

function mockFile(content: string, name: string): File {
  const file = new File([content], name, { type: 'text/plain' });
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: async () => content,
    });
  }
  return file;
}

describe('TranslationJobService', () => {
  let store: ReturnType<typeof createMemoryStore>;
  let service: TranslationJobService;

  beforeEach(() => {
    store = createMemoryStore();
    service = new TranslationJobService(store);
  });

  it('loadFiles 解析字幕并进入 idle', async () => {
    const file = mockFile('Hello\nWorld', 'a.srt');
    await service.loadFiles([file]);
    const snap = service.getSnapshot();
    expect(snap.status).toBe('idle');
    expect(snap.subtitles[0].lines).toHaveLength(2);
    expect(snap.files).toHaveLength(1);
  });

  it('editCue 更新 results SoT', async () => {
    const file = mockFile('Hello', 'a.srt');
    await service.loadFiles([file]);
    const sub = service.getSnapshot().subtitles[0];
    (service as unknown as { snap: { results: Subtitle[] } }).snap.results = [
      { ...sub, lines: [{ ...sub.lines[0], translated: '你好' }] },
    ];
    service.editCue(0, '您好');
    expect(service.getSnapshot().results[0].lines[0].translated).toBe('您好');
  });

  it('start 完成后 status=completed 且清 session', async () => {
    const file = mockFile('Hi', 'a.srt');
    await service.loadFiles([file]);

    await service.start({
      providerId: 'mock',
      providerConfig: {},
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      subtitleMode: 'translate_only',
      temperature: 0,
      batcherConfig: { maxLinesPerBatch: 10, concurrency: 1 },
      debugMode: false,
      glossaryText: '',
    });

    const snap = service.getSnapshot();
    expect(snap.status).toBe('completed');
    expect(snap.results[0].lines[0].translated).toMatch(/^TR:/);
    expect(store.load()).toBeNull();
  });
});
