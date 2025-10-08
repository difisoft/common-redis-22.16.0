"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstAccessLock = void 0;
class FirstAccessLock {
    constructor(redisCommon, lockKey, nodeId, options) {
        this.redisCommon = redisCommon;
        this.lockKey = lockKey;
        this.nodeId = nodeId;
        this.options = options;
        this.extendAttempts = 0;
    }
    /**
     * Attempts to acquire the lock
     * @returns Promise<boolean> - true if lock acquired, false if not
     */
    async acquire() {
        try {
            const acquired = await this.redisCommon.acquireLock(this.lockKey, this.nodeId, this.options.ttlSeconds);
            if (acquired && this.options.extendIntervalMs) {
                this.startExtendTimer();
            }
            return acquired;
        }
        catch (error) {
            console.error('Failed to acquire lock:', error);
            return false;
        }
    }
    /**
     * Releases the lock
     * @returns Promise<boolean> - true if successfully released, false if not the current holder
     */
    async release() {
        try {
            this.stopExtendTimer();
            return await this.redisCommon.releaseLock(this.lockKey, this.nodeId);
        }
        catch (error) {
            console.error('Failed to release lock:', error);
            return false;
        }
    }
    /**
     * Extends the lock TTL
     * @returns Promise<boolean> - true if successfully extended, false if lock no longer exists
     */
    async extend() {
        try {
            const extended = await this.redisCommon.extendLock(this.lockKey, this.options.ttlSeconds);
            if (extended) {
                this.extendAttempts = 0; // Reset counter on successful extend
            }
            else {
                this.extendAttempts++;
                // Stop trying to extend if max attempts reached
                if (this.options.maxExtendAttempts &&
                    this.extendAttempts >= this.options.maxExtendAttempts) {
                    this.stopExtendTimer();
                }
            }
            return extended;
        }
        catch (error) {
            console.error('Failed to extend lock:', error);
            this.extendAttempts++;
            return false;
        }
    }
    /**
     * Gets the current lock status
     * @returns Promise<LockStatus> - current lock information
     */
    async getStatus() {
        try {
            return await this.redisCommon.getLockStatus(this.lockKey);
        }
        catch (error) {
            console.error('Failed to get lock status:', error);
            return {
                currentHolder: null,
                queueLength: 0,
                ttl: -1
            };
        }
    }
    /**
     * Checks if this node currently holds the lock
     * @returns Promise<boolean> - true if this node holds the lock
     */
    async isHoldingLock() {
        try {
            const status = await this.getStatus();
            return status.currentHolder === this.nodeId;
        }
        catch (error) {
            console.error('Failed to check lock ownership:', error);
            return false;
        }
    }
    /**
     * Waits for the lock to become available
     * @param checkIntervalMs - How often to check for lock availability (default: 1000ms)
     * @param maxWaitMs - Maximum time to wait (default: 30000ms)
     * @returns Promise<boolean> - true if lock acquired, false if timeout
     */
    async waitForLock(checkIntervalMs = 1000, maxWaitMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const acquired = await this.acquire();
            if (acquired) {
                return true;
            }
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
        }
        return false;
    }
    startExtendTimer() {
        if (!this.options.extendIntervalMs)
            return;
        this.stopExtendTimer(); // Clear any existing timer
        this.extendTimer = setInterval(async () => {
            const stillHolding = await this.isHoldingLock();
            if (!stillHolding) {
                this.stopExtendTimer();
                return;
            }
            await this.extend();
        }, this.options.extendIntervalMs);
    }
    stopExtendTimer() {
        if (this.extendTimer) {
            clearInterval(this.extendTimer);
            this.extendTimer = undefined;
        }
    }
    /**
     * Cleanup method - should be called when the lock is no longer needed
     */
    destroy() {
        this.stopExtendTimer();
    }
}
exports.FirstAccessLock = FirstAccessLock;
