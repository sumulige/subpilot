/**
 * Upload Limits Configuration
 * 上传限制配置 - 防止内存溢出
 */

export const UPLOAD_LIMITS = {
    /** 最大文件数量 */
    MAX_FILES: 20,
    /** 单文件最大行数 */
    MAX_LINES_PER_FILE: 50000,
    /** 所有文件总行数上限 */
    MAX_TOTAL_LINES: 100000,
    /** 单文件最大大小 (bytes) - 5MB */
    MAX_FILE_SIZE: 5 * 1024 * 1024,
} as const;

export interface UploadValidationResult {
    valid: boolean;
    error?: string;
    warnings?: string[];
}

/**
 * 验证上传的文件是否在限制范围内
 */
export function validateUpload(
    files: File[],
    lineCounts?: number[]
): UploadValidationResult {
    const warnings: string[] = [];

    // 检查文件数量
    if (files.length > UPLOAD_LIMITS.MAX_FILES) {
        return {
            valid: false,
            error: `最多只能上传 ${UPLOAD_LIMITS.MAX_FILES} 个文件，当前选择了 ${files.length} 个`,
        };
    }

    // 检查单文件大小
    for (const file of files) {
        if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            return {
                valid: false,
                error: `文件 "${file.name}" 太大 (${sizeMB}MB)，最大支持 2MB`,
            };
        }
    }

    // 如果提供了行数信息，检查行数限制
    if (lineCounts && lineCounts.length > 0) {
        for (let i = 0; i < lineCounts.length; i++) {
            if (lineCounts[i] > UPLOAD_LIMITS.MAX_LINES_PER_FILE) {
                return {
                    valid: false,
                    error: `文件 "${files[i]?.name}" 行数过多 (${lineCounts[i]} 行)，单文件最多 ${UPLOAD_LIMITS.MAX_LINES_PER_FILE} 行`,
                };
            }
        }

        const totalLines = lineCounts.reduce((sum, count) => sum + count, 0);
        if (totalLines > UPLOAD_LIMITS.MAX_TOTAL_LINES) {
            return {
                valid: false,
                error: `总行数过多 (${totalLines} 行)，最多支持 ${UPLOAD_LIMITS.MAX_TOTAL_LINES} 行`,
            };
        }
    }

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}
