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

  private getClient(): Promise<OwnRedisClientType> {
    if (this.createPromise == null) {
      this.createPromise = new Promise<OwnRedisClientType>((resolve, reject) => {
        let isFinished = false;
        const client = createClient(this.config);
        client.on('error', (err) => {
          try {
            client.close();
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
      });
    } else {
      return this.createPromise;
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
} 