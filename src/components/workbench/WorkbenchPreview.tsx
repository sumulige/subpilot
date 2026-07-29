'use client';

import { VirtualTranslationList } from '@/components';
import { useTranslation } from '@/lib/i18n/context';

export interface WorkbenchPreviewProps {
  fileName?: string;
  isTranslating: boolean;
  lines: Array<{ original: string; translated: string }>;
  onEditLine: (index: number, text: string) => void;
}

export function WorkbenchPreview({
  fileName,
  isTranslating,
  lines,
  onEditLine,
}: WorkbenchPreviewProps) {
  const { t } = useTranslation();

  return (
    <section className="panel flex min-h-[420px] flex-col p-4 lg:min-h-0">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">
          {t('status.livePreview')}
          {fileName ? (
            <span className="ml-2 font-normal text-muted-foreground">
              {fileName}
            </span>
          ) : null}
        </h2>
        {isTranslating && (
          <span className="text-xs text-brand">
            {t('status.livePreviewTranslating')}
          </span>
        )}
        {!isTranslating && lines.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('status.livePreviewComplete', { lines: lines.length })}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
        <VirtualTranslationList
          lines={lines}
          height="100%"
          isTranslating={isTranslating}
          onEditLine={onEditLine}
        />
      </div>
    </section>
  );
}
