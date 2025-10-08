"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstAccessLockExample = void 0;
const index_1 = require("../index");
/**
 * Example usage of FirstAccessLock for distributed resource access
 */
class FirstAccessLockExample {
    constructor(redisConfig, clusterId, nodeId) {
        this.redisCommon = new index_1.RedisCommon(redisConfig, clusterId);
        this.lock = new index_1.FirstAccessLock(this.redisCommon, 'shared-resource-lock', // Lock key
        nodeId, // Unique node identifier
        {
            ttlSeconds: 30, // Lock expires after 30 seconds
            extendIntervalMs: 10000, // Extend lock every 10 seconds
            maxExtendAttempts: 3 // Stop trying to extend after 3 failed attempts
        });
    }
    /**
     * Example: Process shared resource with automatic lock management
     */
    async processSharedResource() {
        try {
            // Try to acquire lock
            const acquired = await this.lock.acquire();
            if (!acquired) {
                console.log('Lock not acquired, waiting...');
                // Wait for lock to become available (max 30 seconds)
                const waited = await this.lock.waitForLock(1000, 30000);
                if (!waited) {
                    console.log('Timeout waiting for lock');
                    return false;
                }
            }
            console.log('Lock acquired, processing resource...');
            // Simulate resource processing
            await this.simulateResourceProcessing();
            console.log('Resource processing completed');
            return true;
        }
        catch (error) {
            console.error('Error processing resource:', error);
            return false;
        }
        finally {
            // Always release the lock
            await this.lock.release();
            console.log('Lock released');
        }
    }
    /**
     * Example: Manual lock management
     */
    async manualLockManagement() {
        try {
            // Check current lock status
            const status = await this.lock.getStatus();
            console.log('Lock status:', status);
            // Try to acquire lock
            if (await this.lock.acquire()) {
                console.log('Lock acquired successfully');
                // Check if we're still holding the lock
                const isHolding = await this.lock.isHoldingLock();
                console.log('Still holding lock:', isHolding);
                // Simulate work
                await this.simulateResourceProcessing();
                // Manually extend lock if needed
                const extended = await this.lock.extend();
                console.log('Lock extended:', extended);
            }
            else {
                console.log('Failed to acquire lock');
            }
        }
        finally {
            // Clean up
            await this.lock.release();
            this.lock.destroy();
        }
    }
    async simulateResourceProcessing() {
        // Simulate some work that takes time
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
exports.FirstAccessLockExample = FirstAccessLockExample;
// Usage example
async function example() {
    const redisConfig = {
        url: 'redis://localhost:6379'
    };
    const example = new FirstAccessLockExample(redisConfig, 'my-cluster', 'node-1');
    // Process shared resource
    await example.processSharedResource();
    // Manual lock management
    await example.manualLockManagement();
}
