'use client';

/**
 * Session Recovery Dialog
 * 会话恢复对话框 - 检测到未完成翻译时显示
 */

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
        (summary.completedLines / summary.totalLines) * 100
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-strong rounded-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">📋</span>
                    <h2 className="text-lg font-semibold">检测到未完成的翻译</h2>
                </div>

                {/* Progress Info */}
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">文件</span>
                        <span>{summary.completedFiles}/{summary.fileCount} 个</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">行数</span>
                        <span>{summary.completedLines}/{summary.totalLines} 行</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progressPercent}% 完成</span>
                        <span>更新于 {summary.timeSinceUpdate}</span>
                    </div>

                    {/* File List */}
                    <div className="mt-4 p-3 bg-white/5 rounded-lg max-h-32 overflow-y-auto">
                        <div className="text-xs text-muted-foreground mb-2">文件列表:</div>
                        {session.files.map((file, i) => {
                            const fp = session.fileProgresses[i];
                            return (
                                <div key={i} className="flex items-center gap-2 text-sm py-1">
                                    <span className={
                                        fp.status === 'completed' ? 'text-green-400' :
                                            fp.status === 'translating' ? 'text-indigo-400' :
                                                'text-muted-foreground'
                                    }>
                                        {fp.status === 'completed' ? '✓' :
                                            fp.status === 'translating' ? '●' : '○'}
                                    </span>
                                    <span className="truncate">{file.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onDiscard}
                    >
                        放弃
                    </Button>
                    <Button
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                        onClick={onRecover}
                    >
                        继续翻译
                    </Button>
                </div>
            </div>
        </div>
    );
}
