import { createClient, RedisClientOptions } from './redis';
export type OwnRedisClientType = ReturnType<typeof createClient>;
export declare class RedisCommon {
    private config;
    private clusterId;
    private createPromise;
    constructor(config: RedisClientOptions, clusterId: string);
    private getClient;
    set<T>(key: string, value: T, subKey?: string, durationInSeconds?: number): Promise<void>;
    private parseReply;
    get<T>(key: string, subKey?: string): Promise<T | null | undefined>;
    del(key: string, subKey?: string): Promise<boolean>;
    private getRedisKey;
    hget<T>(key: string, hKey: string, subKey?: string): Promise<T | null | undefined>;
    hdel(key: string, hKey: string, subKey?: string): Promise<boolean>;
    private serializeValue;
    exists(key: string, subKey?: string): Promise<boolean>;
    hset<T>(key: string, hKey: string, value: T, subKey?: string): Promise<void>;
}
