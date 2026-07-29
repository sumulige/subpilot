'use client';

/**
 * Session Recovery Dialog
 * 会话恢复对话框 - 检测到未完成翻译时显示
 */

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TranslationSession } from '@/lib/engine/translation-session';
import { getSessionSummary } from '@/lib/engine/translation-session';

interface SessionRecoveryDialogProps {
    session: TranslationSession;
    onRecover: () => void;
    onDiscard: () => void;
}

export function SessionRecoveryDialog({
    session,
    onRecover,
    onDiscard,
}: SessionRecoveryDialogProps) {
    const summary = getSessionSummary(session);
    const progressPercent = Math.round(
        (summary.completedLines / Math.max(summary.totalLines, 1)) * 100
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="panel mx-4 w-full max-w-md p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-brand/15 text-brand">
                        <RotateCcw className="size-4" strokeWidth={1.75} />
                    </span>
                    <h2 className="text-base font-semibold tracking-tight">
                        检测到未完成的翻译
                    </h2>
                </div>

                <div className="mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">文件</span>
                        <span className="tabular-nums">
                            {summary.completedFiles}/{summary.fileCount}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">行数</span>
                        <span className="tabular-nums">
                            {summary.completedLines}/{summary.totalLines}
                        </span>
                    </div>

                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="tabular-nums">{progressPercent}%</span>
                        <span>更新于 {summary.timeSinceUpdate}</span>
                    </div>

                    <div className="mt-3 max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
                        <div className="mb-2 text-xs text-muted-foreground">文件列表</div>
                        {session.files.map((file, i) => {
                            const fp = session.fileProgresses[i];
                            return (
                                <div key={i} className="flex items-center gap-2 py-1 text-sm">
                                    <span
                                        className={
                                            fp.status === 'completed'
                                                ? 'text-brand'
                                                : fp.status === 'translating'
                                                  ? 'text-brand'
                                                  : 'text-muted-foreground'
                                        }
                                    >
                                        {fp.status === 'completed'
                                            ? '✓'
                                            : fp.status === 'translating'
                                              ? '●'
                                              : '○'}
                                    </span>
                                    <span className="truncate">{file.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onDiscard}>
                        放弃
                    </Button>
                    <Button className="flex-1" onClick={onRecover}>
                        继续翻译
                    </Button>
                </div>
            </div>
        </div>
    );
}
