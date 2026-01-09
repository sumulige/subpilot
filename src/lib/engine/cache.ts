/**
 * Translation Cache
 * IndexedDB 缓存层
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'subtitle-translator';
const STORE_NAME = 'translations';
const DB_VERSION = 1;

interface CacheEntry {
    key: string;
    value: string;
    timestamp: number;
}

class TranslationCache {
    private dbPromise: Promise<IDBPDatabase> | null = null;

    /** 初始化数据库 */
    private async getDb(): Promise<IDBPDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    }
                },
            });
        }
        return this.dbPromise;
    }

    /** 生成缓存 Key */
    key(text: string, suffix: string): string {
        // 简单哈希，生产环境可用 SparkMD5
        let hash = 0;
        const str = `${text}:${suffix}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `cache_${Math.abs(hash).toString(36)}`;
    }

    /** 获取缓存 */
    async get(key: string): Promise<string | null> {
        try {
            const db = await this.getDb();
            const entry = await db.get(STORE_NAME, key) as CacheEntry | undefined;
            return entry?.value ?? null;
        } catch {
            return null;
        }
    }

    /** 设置缓存 */
    async set(key: string, value: string): Promise<void> {
        try {
            const db = await this.getDb();
            const entry: CacheEntry = {
                key,
                value,
                timestamp: Date.now(),
            };
            await db.put(STORE_NAME, entry);
        } catch (e) {
            console.warn('Cache set failed:', e);
        }
    }

    /** 清空缓存 */
    async clear(): Promise<void> {
        try {
            const db = await this.getDb();
            await db.clear(STORE_NAME);
        } catch (e) {
            console.warn('Cache clear failed:', e);
        }
    }

    /** 获取缓存大小 */
    async size(): Promise<number> {
        try {
            const db = await this.getDb();
            return await db.count(STORE_NAME);
        } catch {
            return 0;
        }
    }
}

export const cache = new TranslationCache();
