import { RedisCommon } from './RedisCommon';
export interface LockOptions {
    ttlSeconds: number;
    extendIntervalMs?: number;
    maxExtendAttempts?: number;
}
export interface LockStatus {
    currentHolder: string | null;
    queueLength: number;
    ttl: number;
}
export declare class FirstAccessLock {
    private redisCommon;
    private lockKey;
    private nodeId;
    private options;
    private extendTimer?;
    private extendAttempts;
    constructor(redisCommon: RedisCommon, lockKey: string, nodeId: string, options: LockOptions);
    /**
     * Attempts to acquire the lock
     * @returns Promise<boolean> - true if lock acquired, false if not
     */
    acquire(): Promise<boolean>;
    /**
     * Releases the lock
     * @returns Promise<boolean> - true if successfully released, false if not the current holder
     */
    release(): Promise<boolean>;
    /**
     * Extends the lock TTL
     * @returns Promise<boolean> - true if successfully extended, false if lock no longer exists
     */
    extend(): Promise<boolean>;
    /**
     * Gets the current lock status
     * @returns Promise<LockStatus> - current lock information
     */
    getStatus(): Promise<LockStatus>;
    /**
     * Checks if this node currently holds the lock
     * @returns Promise<boolean> - true if this node holds the lock
     */
    isHoldingLock(): Promise<boolean>;
    /**
     * Waits for the lock to become available
     * @param checkIntervalMs - How often to check for lock availability (default: 1000ms)
     * @param maxWaitMs - Maximum time to wait (default: 30000ms)
     * @returns Promise<boolean> - true if lock acquired, false if timeout
     */
    waitForLock(checkIntervalMs?: number, maxWaitMs?: number): Promise<boolean>;
    private startExtendTimer;
    private stopExtendTimer;
    /**
     * Cleanup method - should be called when the lock is no longer needed
     */
    destroy(): void;
}
