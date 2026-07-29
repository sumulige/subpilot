'use client';

import { Captions, Github } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/context';

export function WorkbenchHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <Captions className="size-4" strokeWidth={1.75} />
          </span>
          <h1 className="text-[15px] font-semibold tracking-tight">SubPilot</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LanguageSwitcher />
          <a
            href="https://github.com/sumulige/subpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="size-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">{t('common.github')}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
