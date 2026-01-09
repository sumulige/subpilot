/**
 * Provider Registry
 * 管理所有翻译服务 Provider
 */

import type { Provider, ProviderSchema, ProviderConfig, ProviderFactory } from '../types';

interface RegistryEntry {
    schema: ProviderSchema;
    factory: ProviderFactory;
}

class ProviderRegistry {
    private entries = new Map<string, RegistryEntry>();
    private instances = new Map<string, Provider>();

    /** 注册 Provider */
    register(schema: ProviderSchema, factory: ProviderFactory): void {
        this.entries.set(schema.id, { schema, factory });
        this.instances.delete(schema.id);
    }

    /** 获取 Provider 实例 */
    get(id: string, config: ProviderConfig): Provider {
        const entry = this.entries.get(id);
        if (!entry) throw new Error(`Unknown provider: ${id}`);

        const cacheKey = `${id}:${JSON.stringify(config)}`;
        let instance = this.instances.get(cacheKey);
        if (!instance) {
            instance = entry.factory(config);
            this.instances.set(cacheKey, instance);
        }
        return instance;
    }

    /** 获取 Schema */
    getSchema(id: string): ProviderSchema | undefined {
        return this.entries.get(id)?.schema;
    }

    /** 列出所有 Schema */
    list(): ProviderSchema[] {
        return Array.from(this.entries.values()).map((e) => e.schema);
    }

    /** 按类型筛选 */
    listByType(type: 'api' | 'llm'): ProviderSchema[] {
        return this.list().filter((s) => s.type === type);
    }

    /** 检查是否存在 */
    has(id: string): boolean {
        return this.entries.has(id);
    }

    /** 清除实例缓存 */
    clearCache(): void {
        this.instances.clear();
    }
}

export const registry = new ProviderRegistry();

export function registerProvider(schema: ProviderSchema, factory: ProviderFactory): void {
    registry.register(schema, factory);
}
