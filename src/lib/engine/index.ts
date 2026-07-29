/**
 * Engine Entry Point
 */

export { translateSubtitle, translateBatch, retry, type TranslateOptions } from './translator';
export { cache } from './cache';
export {
    TranslationError,
    ErrorType,
    withRetry,
    createTranslationError,
    calculateRetryDelay,
} from './errors';
export {
    createBatches,
    translateWithBatching,
    type BatcherConfig,
    type TranslationBatch,
    type BatchTranslateOptions,
} from './batcher';
export { applyBatchesToSubtitle, countBatchLines } from './apply-batches';
export {
    hashString,
    glossaryHash,
    buildCacheSuffix,
    type CacheSuffixParts,
} from './cache-key';
