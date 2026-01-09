/**
 * Providers Entry Point
 */

export { registry, registerProvider } from './registry';

// 导入所有 Provider（会自动注册）
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

// 重导出 Schema
export { deeplSchema } from './deepl';
export { googleSchema } from './google';
export { openaiSchema } from './openai';
export { deepseekSchema } from './deepseek';
export { nvidiaSchema } from './nvidia';
export { customLLMSchema, createCustomProvider } from './custom';
export { openrouterSchema } from './openrouter';
export { deepinfraSchema } from './deepinfra';
export { tongyiSchema } from './tongyi';
export { doubaoSchema } from './doubao';
