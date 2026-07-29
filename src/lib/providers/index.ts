/**
 * Providers Entry Point（client-safe：不含 AI SDK）
 */

export { registry, registerProvider, registerDescriptor } from './registry';
export type {
  ProviderDescriptor,
  SdkAdapterConfig,
  ModelsCatalogConfig,
} from './descriptor';

// 导入所有 Provider（会自动注册 Descriptor）
import './deepl';
import './google';
import './openai';
import './deepseek';
import './nvidia';
import './custom';
import './openrouter';
import './deepinfra';
import './tongyi';
import './doubao';

// 重导出 Schema / Descriptor
export { deeplSchema, deeplDescriptor } from './deepl';
export { googleSchema, googleDescriptor } from './google';
export { openaiSchema, openaiDescriptor } from './openai';
export { deepseekSchema, deepseekDescriptor } from './deepseek';
export { nvidiaSchema, nvidiaDescriptor } from './nvidia';
export {
  customLLMSchema,
  createCustomProvider,
  customDescriptor,
} from './custom';
export { openrouterSchema, openrouterDescriptor } from './openrouter';
export { deepinfraSchema, deepinfraDescriptor } from './deepinfra';
export { tongyiSchema, tongyiDescriptor } from './tongyi';
export { doubaoSchema, doubaoDescriptor } from './doubao';
