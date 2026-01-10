'use client';

/**
 * Virtual Scrolling Translation List Component
 * 虚拟滚动翻译列表 - 使用 @tanstack/react-virtual
 * 支持高效渲染 50000+ 行数据
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from '@/lib/i18n/context';

interface TranslationLine {
    original: string;
    translated: string;
}

interface VirtualTranslationListProps {
    lines: TranslationLine[];
    height?: number;
    onEditLine?: (index: number, newTranslation: string) => void;
    isTranslating?: boolean;
}

export function VirtualTranslationList({
    lines,
    height = 500,
    onEditLine,
    isTranslating = false,
}: VirtualTranslationListProps) {
    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const virtualizer = useVirtualizer({
        count: lines.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 70, // Estimated row height
        overscan: 5, // Render 5 extra items above/below viewport
    });

    // Auto-scroll to bottom when new lines are added during translation
    useEffect(() => {
        if (isTranslating && lines.length > 0) {
            virtualizer.scrollToIndex(lines.length - 1, { align: 'end' });
        }
    }, [lines.length, isTranslating, virtualizer]);

    const handleStartEdit = useCallback((index: number, currentValue: string) => {
        setEditingIndex(index);
        setEditValue(currentValue);
    }, []);

    const handleSaveEdit = useCallback((index: number) => {
        if (onEditLine && editValue !== lines[index]?.translated) {
            onEditLine(index, editValue);
        }
        setEditingIndex(null);
    }, [onEditLine, editValue, lines]);

    const handleCancelEdit = useCallback(() => {
        setEditingIndex(null);
        setEditValue('');
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit(index);
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleSaveEdit(index);
            // Move to next line
            if (index < lines.length - 1) {
                handleStartEdit(index + 1, lines[index + 1].translated);
            }
        }
    }, [handleSaveEdit, handleCancelEdit, handleStartEdit, lines]);

    if (lines.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
                <div className="text-center">
                    <div className="text-4xl mb-3 opacity-50">📄</div>
                    <p>{t('common.uploadAndStart')}</p>
                    <p className="text-xs mt-1">{t('common.resultsHere')}</p>
                </div>
            </div>
        );
    }

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div className="relative">
            {/* Line count indicator */}
            <div className="absolute top-0 right-2 text-xs text-muted-foreground z-10 bg-background/80 px-2 py-1 rounded">
                {t('common.linesCount', { count: lines.length })}
            </div>

            <div
                ref={parentRef}
                className="overflow-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                style={{ height, maxHeight: height }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualItems.map((virtualItem) => {
                        const index = virtualItem.index;
                        const line = lines[index];
                        const isEditing = editingIndex === index;
                        const isLatest = isTranslating && index === lines.length - 1;

                        return (
                            <div
                                key={virtualItem.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                                className={`px-3 py-2 border-b border-white/5 ${isLatest ? 'bg-indigo-500/10' : ''
                                    } hover:bg-white/5 transition-colors`}
                            >
                                {/* Original text */}
                                <div className="text-xs text-muted-foreground mb-1 truncate" title={line.original}>
                                    {line.original}
                                </div>

                                {/* Translated text - editable */}
                                {isEditing ? (
                                    <textarea
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        onBlur={() => handleSaveEdit(index)}
                                        className="w-full bg-white/10 border border-indigo-500/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                        rows={2}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`text-sm cursor-text hover:bg-white/10 rounded px-1 -mx-1 ${isLatest && isTranslating ? 'typing-cursor' : ''
                                            }`}
                                        onClick={() => !isTranslating && handleStartEdit(index, line.translated)}
                                        title={t('common.clickToEdit')}
                                    >
                                        {line.translated || '...'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
