import { createClient, RedisClientOptions } from './redis';
export type OwnRedisClientType = ReturnType<typeof createClient>;
export declare class RedisCommon {
    private config;
    private category;
    private createPromise;
    constructor(config: RedisClientOptions, category: string);
    private getClient;
    set<T>(key: string, value: T, durationInSeconds?: number): Promise<void>;
    private parseReply;
    get<T>(key: string): Promise<T | null | undefined>;
    del(key: string): Promise<boolean>;
    private getRedisKey;
    hget<T>(key: string, field: string): Promise<T | null | undefined>;
    hdel(key: string, field: string): Promise<boolean>;
    private serializeValue;
    exists(key: string): Promise<boolean>;
    hset<T>(key: string, field: string, value: T): Promise<void>;
}
