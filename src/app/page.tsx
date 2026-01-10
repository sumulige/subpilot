'use client';

/**
 * SubPilot - Main Page
 * 批量字幕翻译工具
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileUploader,
  ProviderSelector,
  ProviderConfigForm,
  TranslationProgressDisplay,
  LanguageSelector,
  AdvancedSettings,
} from '@/components';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { registry } from '@/lib/providers';
import { getParser, detectFormat } from '@/lib/parsers';
import { translateBatch } from '@/lib/engine';
import { type BatcherConfig } from '@/lib/engine/batcher';
import type { ProviderConfig, TranslationProgress, Subtitle } from '@/lib/types';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // 初始化后设置 mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // 文件状态
  const [files, setFiles] = useState<File[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  // Provider 状态（持久化到 localStorage）
  const [providerId, setProviderId] = useLocalStorage('providerId', 'nvidia');
  const [providerConfigs, setProviderConfigs] = useLocalStorage<Record<string, ProviderConfig>>('providerConfigs', {});

  // 当前 Provider 的配置
  const providerConfig = providerConfigs[providerId] || {};
  const setProviderConfig = useCallback((config: ProviderConfig) => {
    setProviderConfigs((prev) => ({ ...prev, [providerId]: config }));
  }, [providerId, setProviderConfigs]);

  // 语言状态（持久化）
  const [sourceLanguage, setSourceLanguage] = useLocalStorage('sourceLanguage', 'auto');
  const [targetLanguage, setTargetLanguage] = useLocalStorage('targetLanguage', 'zh');

  // 新增配置状态（持久化）
  const [subtitleMode, setSubtitleMode] = useLocalStorage<'bilingual' | 'translate_only'>('subtitleMode', 'bilingual');
  const [temperature, setTemperature] = useLocalStorage('temperature', 0);
  const [batcherConfig, setBatcherConfig] = useLocalStorage<Partial<BatcherConfig>>('batcherConfig', {});

  // 调试模式
  const [debugMode, setDebugMode] = useLocalStorage('debugMode', false);

  // 翻译状态
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [results, setResults] = useState<Subtitle[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 处理文件选择
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(null);

    // 解析字幕文件
    const parsed: Subtitle[] = [];
    for (const file of selectedFiles) {
      const format = detectFormat(file.name);
      if (!format) continue;

      const text = await file.text();
      const parser = getParser(format);
      parsed.push(parser.parse(text));
    }
    setSubtitles(parsed);
  }, []);

  // 开始翻译
  const handleTranslate = useCallback(async () => {
    if (subtitles.length === 0) {
      setError('请先上传字幕文件');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const provider = registry.get(providerId, providerConfig);
      const translated = await translateBatch(subtitles, {
        provider,
        source: sourceLanguage,
        target: targetLanguage,
        options: { concurrency: batcherConfig.concurrency, retries: 3, timeout: 60000 },
        batcherConfig: {
          ...batcherConfig,
          debug: debugMode
        },
        temperature: temperature,
        subtitleMode: subtitleMode,
        onProgress: setProgress,
      });
      setResults(translated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsTranslating(false);
    }
  }, [subtitles, providerId, providerConfig, sourceLanguage, targetLanguage, debugMode, batcherConfig, temperature, subtitleMode]);

  // 下载结果
  const handleDownload = useCallback(() => {
    results.forEach((subtitle, index) => {
      const originalFile = files[index];
      const format = detectFormat(originalFile.name);
      if (!format) return;

      const parser = getParser(format);
      const content = parser.serialize(subtitle);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = originalFile.name.replace(/(\.[^.]+)$/, `_${targetLanguage}$1`);
      link.click();
      URL.revokeObjectURL(url);
    });
  }, [results, files, targetLanguage]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">⚡ SubPilot</h1>
          <p className="text-muted-foreground">AI 驱动的批量字幕翻译，支持 50+ 种语言</p>
        </header>

        <div className="grid gap-6">
          {/* 文件上传 */}
          <Card>
            <CardHeader>
              <CardTitle>1. 上传字幕文件</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader onFilesSelected={handleFilesSelected} />
            </CardContent>
          </Card>

          {/* 翻译设置 */}
          <Card>
            <CardHeader>
              <CardTitle>2. 翻译设置</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="provider" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="provider">翻译服务</TabsTrigger>
                  <TabsTrigger value="language">语言设置</TabsTrigger>
                </TabsList>

                <TabsContent value="provider" className="space-y-4">
                  <ProviderSelector value={providerId} onChange={setProviderId} />
                  <ProviderConfigForm
                    providerId={providerId}
                    config={providerConfig}
                    onChange={setProviderConfig}
                  />

                  {/* 字幕模式设置 */}
                  <div className="pt-4 border-t">
                    <div className="space-y-3">
                      <Label>字幕模式</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={subtitleMode === 'bilingual'}
                          onCheckedChange={(checked) => setSubtitleMode(checked ? 'bilingual' : 'translate_only')}
                        />
                        <span className="text-sm">
                          {subtitleMode === 'bilingual' ? '双语字幕 (原文+译文)' : '仅译文'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="language" className="grid gap-4 sm:grid-cols-2">
                  <LanguageSelector
                    label="源语言"
                    value={sourceLanguage}
                    onChange={setSourceLanguage}
                    showAuto
                  />
                  <LanguageSelector
                    label="目标语言"
                    value={targetLanguage}
                    onChange={setTargetLanguage}
                  />
                </TabsContent>
              </Tabs>

              {/* 高级设置 (可展开) */}
              <div className="mt-6">
                <AdvancedSettings
                  config={batcherConfig}
                  onConfigChange={setBatcherConfig}
                  temperature={temperature}
                  onTemperatureChange={setTemperature}
                />
              </div>

              <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                <Switch
                  id="debug-mode"
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                />
                <Label htmlFor="debug-mode">开启调试模式 (Debug Mode) - 在控制台显示日志</Label>
              </div>
            </CardContent>
          </Card>

          {/* 翻译操作 */}
          <Card>
            <CardHeader>
              <CardTitle>3. 开始翻译</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TranslationProgressDisplay progress={progress} isTranslating={isTranslating} />

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating || files.length === 0}
                  className="flex-1"
                >
                  {isTranslating ? '翻译中...' : '开始翻译'}
                </Button>

                {results.length > 0 && (
                  <Button variant="outline" onClick={handleDownload}>
                    下载结果
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 结果预览 */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>翻译结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results[0]?.lines.slice(0, 10).map((line) => (
                    <div key={line.index} className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {subtitleMode === 'bilingual' ? (
                        <div className="font-medium">{line.translated || line.text}</div>
                      ) : (
                        <>
                          <div className="text-muted-foreground opacity-70 mb-1">{line.text}</div>
                          <div className="font-medium">{line.translated}</div>
                        </>
                      )}
                    </div>
                  ))}
                  {results[0]?.lines.length > 10 && (
                    <div className="text-center text-muted-foreground text-sm py-2">
                      ... 共 {results[0].lines.length} 行
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          © 2026{' '}
          <a
            href="https://github.com/sumulige/subpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            SubPilot
          </a>
          {' '}• by{' '}
          <a
            href="https://gengnuo-1257145452.cos.ap-beijing.myqcloud.com/uPic/2024-11-21/14:10:19-InQEtF.png"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            sumulige
          </a>
        </footer>
      </div>
    </div>
  );
}
