import { createClient, RedisClientOptions } from 'redis';
export type OwnRedisClientType = ReturnType<typeof createClient>;
export declare class RedisCommon {
    private config;
    private clusterId;
    private createPromise;
    constructor(config: RedisClientOptions, clusterId: string);
    protected getClient(): Promise<OwnRedisClientType>;
    set<T>(key: string, value: T, subKey?: string, durationInSeconds?: number): Promise<void>;
    private parseReply;
    get<T>(key: string, subKey?: string): Promise<T | null | undefined>;
    getOrNull<T>(key: string, subKey?: string): Promise<T | null | undefined>;
    del(key: string, subKey?: string): Promise<boolean>;
    private getRedisKey;
    hget<T>(key: string, hKey: string, subKey?: string): Promise<T | null | undefined>;
    hgetOrNull<T>(key: string, hKey: string, subKey?: string): Promise<T | null | undefined>;
    hdel(key: string, hKey: string, subKey?: string): Promise<boolean>;
    private serializeValue;
    exists(key: string, subKey?: string): Promise<boolean>;
    hset<T>(key: string, hKey: string, value: T, subKey?: string): Promise<void>;
    lpush<T>(key: string, ...values: T[]): Promise<number>;
    rpush<T>(key: string, ...values: T[]): Promise<number>;
    lpop<T>(key: string): Promise<T | null | undefined>;
    rpop<T>(key: string): Promise<T | null | undefined>;
    llen(key: string): Promise<number>;
    lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
    lindex<T>(key: string, index: number): Promise<T | null | undefined>;
    lset<T>(key: string, index: number, value: T): Promise<void>;
    lrem<T>(key: string, count: number, value: T): Promise<number>;
    ltrim(key: string, start: number, stop: number): Promise<void>;
    acquireLock(lockKey: string, nodeId: string, ttlSeconds: number): Promise<boolean>;
    extendLock(lockKey: string, ttlSeconds: number): Promise<boolean>;
    releaseLock(lockKey: string, nodeId: string): Promise<boolean>;
    getLockStatus(lockKey: string): Promise<{
        currentHolder: string | null;
        queueLength: number;
        ttl: number;
    }>;
}
