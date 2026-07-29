/**
 * Job 模块入口
 */

export type {
  JobStatus,
  JobRunConfig,
  JobSnapshot,
} from './types';
export { emptySnapshot } from './types';
export { canTransition, tryTransition } from './state-machine';
export type { JobStorePort } from './ports';
export { localJobStore } from './store-local';
export { TranslationJobService } from './job-service';
export {
  hashString,
  glossaryHash,
  buildCacheSuffix,
  type CacheSuffixParts,
} from '@/lib/engine/cache-key';
