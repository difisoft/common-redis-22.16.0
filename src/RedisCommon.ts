import { createClient, RedisClientOptions } from 'redis';
import { KeyNotExistError } from './KeyNotExistError';

const DataType = {
  UNDEFINED: 'a',
  NULL: 'b',
  BOOLEAN: '0',
  STRING: '1',
  NUMBER: '2',
  DATE: '3',
  OBJECT: '4',
};

export type OwnRedisClientType = ReturnType<typeof createClient>;

export class RedisCommon {
  private createPromise: Promise<OwnRedisClientType> | undefined;

  constructor(private config: RedisClientOptions, private clusterId: string) {

  }

  protected async getClient(): Promise<OwnRedisClientType> {
    if (this.createPromise == null) {
      this.createPromise = new Promise<OwnRedisClientType>((resolve, reject) => {
        let isFinished = false;
        const client = createClient(this.config);
        
        client.on('error', (err) => {
          try {
            client.quit();
          } catch (err) {
            console.error(err);
          }
          // next get method will create a new client
          this.createPromise = undefined;
          if (isFinished) {
            return;
          }
          isFinished = true;
          reject(err);
        });

        client.on('ready', () => {
          if (isFinished) {
            return;
          }
          isFinished = true;
          resolve(client);
        });

        client.connect().catch((err) => {
          if (isFinished) {
            return;
          }
          isFinished = true;
          reject(err);
        });
      });
    }
    return this.createPromise;
  }

  async set<T>(
    key: string,
    value: T,
    subKey?: string,
    durationInSeconds?: number
  ): Promise<void> {
    const client = await this.getClient();
    let valueAsString = this.serializeValue(value);
    await client.set(this.getRedisKey(key, subKey), valueAsString, durationInSeconds != null ? {
      EX: durationInSeconds,
    } : undefined);
    return;
  }

  private parseReply<T>(reply: string): T | null | undefined {
    const type = reply[0];
    if (type === DataType.NULL) {
      return null;
    } else if (type === DataType.UNDEFINED) {
      return undefined;
    } else if (type === DataType.BOOLEAN) {
      const content = reply.substring(1, reply.length);
      return (content === '1') as unknown as T;
    } else if (type === DataType.STRING) {
      const content = reply.substring(1, reply.length);
      return (content as unknown) as T;
    } else if (type === DataType.NUMBER) {
      const content = reply.substring(1, reply.length);
      return (Number(content) as unknown) as T;
    } else if (type === DataType.DATE) {
      const content = reply.substring(1, reply.length);
      return (new Date(Number(content)) as unknown) as T;
    } else {
      const content = reply.substring(1, reply.length);
      return JSON.parse(content);
    }
  }

  async get<T>(key: string, subKey?: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.get(this.getRedisKey(key, subKey));
    if (reply == null) {
      throw new KeyNotExistError(this.getRedisKey(key, subKey));
    }
    return this.parseReply<T>(reply);
  }

  async getOrNull<T>(key: string, subKey?: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.get(this.getRedisKey(key, subKey));
    if (reply == null) {
      return null;
    }
    return this.parseReply<T>(reply);
  }

  async del(key: string, subKey?: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.del(this.getRedisKey(key, subKey))) > 0;
  }

  private getRedisKey(key: string, subKey?: string): string {
    return subKey ? `${this.clusterId}_${key}_${subKey}` : `${this.clusterId}_${key}`;
  }

  async hget<T>(key: string, hKey: string, subKey?: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.hget(this.getRedisKey(key, subKey), hKey);
    if (reply == null) {
      throw new KeyNotExistError(this.getRedisKey(key, subKey));
    }
    return this.parseReply<T>(reply as string);
  }

  async hgetOrNull<T>(key: string, hKey: string, subKey?: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.hget(this.getRedisKey(key, subKey), hKey);
    if (reply == null) {
      return null;
    }
    return this.parseReply<T>(reply as string);
  }

  async hdel(key: string, hKey: string, subKey?: string): Promise<boolean> {
    const client = await this.getClient();
    const reply = await client.hdel(this.getRedisKey(key, subKey), hKey);
    return reply != null;
  }

  private serializeValue<T>(value: T): string {
    let valueAsString = null;
    if (value === null) {
      valueAsString = `${DataType.NULL}${value}`;
    } else if (value === undefined) {
      valueAsString = `${DataType.UNDEFINED}${value}`;
    } else if (typeof value === 'boolean') {
      valueAsString = `${DataType.BOOLEAN}${value ? '1' : '0'}`;
    } else if (typeof value === 'string') {
      valueAsString = `${DataType.STRING}${value}`;
    } else if (typeof value === 'number') {
      valueAsString = `${DataType.NUMBER}${value}`;
    } else if (value instanceof Date) {
      valueAsString = `${DataType.DATE}${((value as unknown) as Date).getTime()}`;
    } else {
      valueAsString = `${DataType.OBJECT}${JSON.stringify(value)}`;
    }
    return valueAsString;
  }

  async exists(key: string, subKey?: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.exists(this.getRedisKey(key, subKey))) > 0;
  }

  async hset<T>(key: string, hKey: string, value: T, subKey?: string): Promise<void> {
    const client = await this.getClient();
    const valueAsString = this.serializeValue(value);
    await client.hset(this.getRedisKey(key, subKey), hKey, valueAsString);
    return;
  }

  // List operations
  async lpush<T>(key: string, ...values: T[]): Promise<number> {
    const client = await this.getClient();
    const serializedValues = values.map(value => this.serializeValue(value));
    return await client.lPush(this.getRedisKey(key), serializedValues);
  }

  async rpush<T>(key: string, ...values: T[]): Promise<number> {
    const client = await this.getClient();
    const serializedValues = values.map(value => this.serializeValue(value));
    return await client.rPush(this.getRedisKey(key), serializedValues);
  }

  async lpop<T>(key: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.lPop(this.getRedisKey(key));
    if (reply == null) {
      return null;
    }
    return this.parseReply<T>(reply);
  }

  async rpop<T>(key: string): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.rPop(this.getRedisKey(key));
    if (reply == null) {
      return null;
    }
    return this.parseReply<T>(reply);
  }

  async llen(key: string): Promise<number> {
    const client = await this.getClient();
    return await client.lLen(this.getRedisKey(key));
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const client = await this.getClient();
    const replies = await client.lRange(this.getRedisKey(key), start, stop);
    if (replies == null) {
      return [];
    }
    const results: T[] = [];
    for (const reply of replies) {
      const result = this.parseReply<T>(reply);
      if (result != null) {
        results.push(result);
      }
    }
    return results;
  }

  async lindex<T>(key: string, index: number): Promise<T | null | undefined> {
    const client = await this.getClient();
    const reply = await client.lIndex(this.getRedisKey(key), index);
    if (reply == null) {
      return null;
    }
    return this.parseReply<T>(reply);
  }

  async lset<T>(key: string, index: number, value: T): Promise<void> {
    const client = await this.getClient();
    const valueAsString = this.serializeValue(value);
    await client.lSet(this.getRedisKey(key), index, valueAsString);
    return;
  }

  async lrem<T>(key: string, count: number, value: T): Promise<number> {
    const client = await this.getClient();
    const valueAsString = this.serializeValue(value);
    return await client.lRem(this.getRedisKey(key), count, valueAsString);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const client = await this.getClient();
    await client.lTrim(this.getRedisKey(key), start, stop);
    return;
  }

  // Lock operations
  async acquireLock(lockKey: string, nodeId: string, ttlSeconds: number): Promise<boolean> {
    const client = await this.getClient();
    const key = this.getRedisKey(lockKey);
    
    // Add this node to the waiting list
    await client.lPush(key, nodeId);
    
    // Set TTL for the entire lock
    await client.expire(key, ttlSeconds);
    
    // Check if this node is first in line
    const firstNode = await client.lIndex(key, -1); // Get the last element (first in queue)
    return firstNode === nodeId;
  }

  async extendLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    const client = await this.getClient();
    const key = this.getRedisKey(lockKey);
    
    // Extend TTL if the key exists
    const exists = await client.exists(key);
    if (exists) {
      await client.expire(key, ttlSeconds);
      return true;
    }
    return false;
  }

  async releaseLock(lockKey: string, nodeId: string): Promise<boolean> {
    const client = await this.getClient();
    const key = this.getRedisKey(lockKey);
    
    // Check if this node is still first in line
    const firstNode = await client.lIndex(key, -1);
    if (firstNode !== nodeId) {
      return false; // This node is not the current holder
    }
    
    // Remove this node from the queue
    await client.lPop(key);
    
    // If queue is empty, delete the key
    const length = await client.lLen(key);
    if (length === 0) {
      await client.del(key);
    }
    
    return true;
  }

  async getLockStatus(lockKey: string): Promise<{ currentHolder: string | null; queueLength: number; ttl: number }> {
    const client = await this.getClient();
    const key = this.getRedisKey(lockKey);
    
    const currentHolder = await client.lIndex(key, -1);
    const queueLength = await client.lLen(key);
    const ttl = await client.ttl(key);
    
    return {
      currentHolder: currentHolder as string | null,
      queueLength,
      ttl
    };
  }

  
} 