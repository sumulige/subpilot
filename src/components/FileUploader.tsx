'use client';

/**
 * File Uploader Component
 * 拖拽或点击上传字幕文件
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { detectFormat } from '@/lib/parsers';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
}

export function FileUploader({ onFilesSelected, accept = '.srt,.vtt,.ass,.ssa,.lrc', multiple = true }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            (file) => detectFormat(file.name) !== null
        );

        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            onFilesSelected(droppedFiles);
        }
    }, [onFilesSelected]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            onFilesSelected(selectedFiles);
        }
    }, [onFilesSelected]);

    const removeFile = useCallback((index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFilesSelected(newFiles);
    }, [files, onFilesSelected]);

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
                        拖拽字幕文件到此处，或点击选择文件
                    </p>
                    <p className="text-xs text-muted-foreground">
                        支持格式：SRT, VTT, ASS, LRC
                    </p>
                </div>
            </Card>

            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium">已选择 {files.length} 个文件</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                            >
                                <span className="truncate">{file.name}</span>
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
