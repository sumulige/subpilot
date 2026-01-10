'use client';

/**
 * File Uploader Component
 * 拖拽或点击上传字幕文件
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { detectFormat } from '@/lib/parsers';
import { UPLOAD_LIMITS, validateUpload } from '@/lib/upload-limits';
import { useTranslation } from '@/lib/i18n/context';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
}

export function FileUploader({ onFilesSelected, accept = '.srt,.vtt,.ass,.ssa,.lrc', multiple = true }: FileUploaderProps) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFiles = useCallback((selectedFiles: File[]) => {
        setError(null);

        // Filter valid subtitle files
        const validFiles = selectedFiles.filter(
            (file) => detectFormat(file.name) !== null
        );

        if (validFiles.length === 0) {
            setError(t('common.invalidFile', { formats: 'SRT, VTT, ASS, LRC' }));
            return;
        }

        // Merge with existing files, avoiding duplicates by filename
        const existingNames = new Set(files.map(f => f.name));
        const newFiles = validFiles.filter(f => !existingNames.has(f.name));
        const mergedFiles = [...files, ...newFiles];

        // Validate merged files against limits
        const validation = validateUpload(mergedFiles);
        if (!validation.valid) {
            setError(validation.error || t('common.validationError'));
            return;
        }

        setFiles(mergedFiles);
        onFilesSelected(mergedFiles);
    }, [onFilesSelected, files]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(Array.from(e.dataTransfer.files));
    }, [processFiles]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(e.target.files || []));
    }, [processFiles]);

    const removeFile = useCallback((index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        setError(null);
        onFilesSelected(newFiles);
    }, [files, onFilesSelected]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="space-y-4">
            <Card
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <input
                    id="file-input"
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInput}
                    className="hidden"
                />
                <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <p className="text-sm text-muted-foreground">
                        {t('common.dragDrop')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('common.supports', { formats: 'SRT, VTT, ASS, LRC', limit: UPLOAD_LIMITS.MAX_FILES })}
                    </p>
                </div>
            </Card>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium">{t('common.selectedCount', { count: files.length })}</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span className="text-muted-foreground">📄</span>
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({formatFileSize(file.size)})
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(index);
                                    }}
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
