import { RedisClientOptions } from 'redis';
/**
 * Example usage of FirstAccessLock for distributed resource access
 */
export declare class FirstAccessLockExample {
    private redisCommon;
    private lock;
    constructor(redisConfig: RedisClientOptions, clusterId: string, nodeId: string);
    /**
     * Example: Process shared resource with automatic lock management
     */
    processSharedResource(): Promise<boolean>;
    /**
     * Example: Manual lock management
     */
    manualLockManagement(): Promise<void>;
    private simulateResourceProcessing;
}
