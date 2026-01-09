'use client';

/**
 * Translation Progress Component
 */

import { Progress } from '@/components/ui/progress';
import type { TranslationProgress } from '@/lib/types';

interface TranslationProgressProps {
    progress: TranslationProgress | null;
    isTranslating: boolean;
}

export function TranslationProgressDisplay({ progress, isTranslating }: TranslationProgressProps) {
    if (!isTranslating || !progress) return null;

    const percent = Math.round((progress.current / progress.total) * 100);

    return (
        <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
                <span>翻译进度</span>
                <span>{progress.current} / {progress.total}</span>
            </div>
            <Progress value={percent} />
            {progress.file && (
                <div className="text-xs text-muted-foreground">{progress.file}</div>
            )}
        </div>
    );
}
