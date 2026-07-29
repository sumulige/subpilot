/**
 * Provider Registry
 * 管理所有翻译服务 Provider（以 Descriptor 为唯一注册单元）
 */

import type { Provider, ProviderSchema, ProviderConfig, ProviderFactory } from '../types';
import type { ProviderDescriptor } from './descriptor';

interface RegistryEntry {
  descriptor: ProviderDescriptor;
}

class ProviderRegistry {
  private entries = new Map<string, RegistryEntry>();
  private instances = new Map<string, Provider>();

  /** 注册完整 Descriptor */
  register(descriptor: ProviderDescriptor): void {
    this.entries.set(descriptor.schema.id, { descriptor });
    this.instances.delete(descriptor.schema.id);
  }

  /** 获取 Provider 实例 */
  get(id: string, config: ProviderConfig): Provider {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown provider: ${id}`);

    const cacheKey = `${id}:${JSON.stringify(config)}`;
    let instance = this.instances.get(cacheKey);
    if (!instance) {
      instance = entry.descriptor.factory(config);
      this.instances.set(cacheKey, instance);
    }
    return instance;
  }

  getDescriptor(id: string): ProviderDescriptor | undefined {
    return this.entries.get(id)?.descriptor;
  }

  getSchema(id: string): ProviderSchema | undefined {
    return this.entries.get(id)?.descriptor.schema;
  }

  list(): ProviderSchema[] {
    return Array.from(this.entries.values()).map((e) => e.descriptor.schema);
  }

  listDescriptors(): ProviderDescriptor[] {
    return Array.from(this.entries.values()).map((e) => e.descriptor);
  }

  listByType(type: 'api' | 'llm'): ProviderSchema[] {
    return this.list().filter((s) => s.type === type);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** 是否支持 /api/models 动态拉取 */
  supportsModelFetch(id: string): boolean {
    return !!this.entries.get(id)?.descriptor.modelsCatalog;
  }

  clearCache(): void {
    this.instances.clear();
  }
}

export const registry = new ProviderRegistry();

/** 注册 Descriptor（推荐） */
export function registerDescriptor(descriptor: ProviderDescriptor): void {
  registry.register(descriptor);
}

/**
 * 兼容旧签名：registerProvider(schema, factory)
 * 或 registerProvider(descriptor)
 */
export function registerProvider(
  schemaOrDescriptor: ProviderSchema | ProviderDescriptor,
  factory?: ProviderFactory
): void {
  if (
    typeof schemaOrDescriptor === 'object' &&
    'schema' in schemaOrDescriptor &&
    'factory' in schemaOrDescriptor
  ) {
    registry.register(schemaOrDescriptor as ProviderDescriptor);
    return;
  }
  if (!factory) {
    throw new Error('registerProvider(schema, factory) requires factory');
  }
  registry.register({
    schema: schemaOrDescriptor as ProviderSchema,
    factory,
  });
}
