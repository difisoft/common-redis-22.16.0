"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCommon = void 0;
const redis_1 = require("redis");
const KeyNotExistError_1 = require("./KeyNotExistError");
const DataType = {
    UNDEFINED: 'a',
    NULL: 'b',
    BOOLEAN: '0',
    STRING: '1',
    NUMBER: '2',
    DATE: '3',
    OBJECT: '4',
};
class RedisCommon {
    constructor(config, clusterId) {
        this.config = config;
        this.clusterId = clusterId;
    }
    async getClient() {
        if (this.createPromise == null) {
            this.createPromise = new Promise((resolve, reject) => {
                let isFinished = false;
                const client = (0, redis_1.createClient)(this.config);
                client.on('error', (err) => {
                    try {
                        client.quit();
                    }
                    catch (err) {
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
    async set(key, value, subKey, durationInSeconds) {
        const client = await this.getClient();
        let valueAsString = this.serializeValue(value);
        await client.set(this.getRedisKey(key, subKey), valueAsString, durationInSeconds != null ? {
            EX: durationInSeconds,
        } : undefined);
        return;
    }
    parseReply(reply) {
        const type = reply[0];
        if (type === DataType.NULL) {
            return null;
        }
        else if (type === DataType.UNDEFINED) {
            return undefined;
        }
        else if (type === DataType.BOOLEAN) {
            const content = reply.substring(1, reply.length);
            return (content === '1');
        }
        else if (type === DataType.STRING) {
            const content = reply.substring(1, reply.length);
            return content;
        }
        else if (type === DataType.NUMBER) {
            const content = reply.substring(1, reply.length);
            return Number(content);
        }
        else if (type === DataType.DATE) {
            const content = reply.substring(1, reply.length);
            return new Date(Number(content));
        }
        else {
            const content = reply.substring(1, reply.length);
            return JSON.parse(content);
        }
    }
    async get(key, subKey) {
        const client = await this.getClient();
        const reply = await client.get(this.getRedisKey(key, subKey));
        if (reply == null) {
            throw new KeyNotExistError_1.KeyNotExistError(this.getRedisKey(key, subKey));
        }
        return this.parseReply(reply);
    }
    async getOrNull(key, subKey) {
        const client = await this.getClient();
        const reply = await client.get(this.getRedisKey(key, subKey));
        if (reply == null) {
            return null;
        }
        return this.parseReply(reply);
    }
    async del(key, subKey) {
        const client = await this.getClient();
        return (await client.del(this.getRedisKey(key, subKey))) > 0;
    }
    getRedisKey(key, subKey) {
        return subKey ? `${this.clusterId}_${key}_${subKey}` : `${this.clusterId}_${key}`;
    }
    async hget(key, hKey, subKey) {
        const client = await this.getClient();
        const reply = await client.hget(this.getRedisKey(key, subKey), hKey);
        if (reply == null) {
            throw new KeyNotExistError_1.KeyNotExistError(this.getRedisKey(key, subKey));
        }
        return this.parseReply(reply);
    }
    async hgetOrNull(key, hKey, subKey) {
        const client = await this.getClient();
        const reply = await client.hget(this.getRedisKey(key, subKey), hKey);
        if (reply == null) {
            return null;
        }
        return this.parseReply(reply);
    }
    async hdel(key, hKey, subKey) {
        const client = await this.getClient();
        const reply = await client.hdel(this.getRedisKey(key, subKey), hKey);
        return reply != null;
    }
    serializeValue(value) {
        let valueAsString = null;
        if (value === null) {
            valueAsString = `${DataType.NULL}${value}`;
        }
        else if (value === undefined) {
            valueAsString = `${DataType.UNDEFINED}${value}`;
        }
        else if (typeof value === 'boolean') {
            valueAsString = `${DataType.BOOLEAN}${value ? '1' : '0'}`;
        }
        else if (typeof value === 'string') {
            valueAsString = `${DataType.STRING}${value}`;
        }
        else if (typeof value === 'number') {
            valueAsString = `${DataType.NUMBER}${value}`;
        }
        else if (value instanceof Date) {
            valueAsString = `${DataType.DATE}${value.getTime()}`;
        }
        else {
            valueAsString = `${DataType.OBJECT}${JSON.stringify(value)}`;
        }
        return valueAsString;
    }
    async exists(key, subKey) {
        const client = await this.getClient();
        return (await client.exists(this.getRedisKey(key, subKey))) > 0;
    }
    async hset(key, hKey, value, subKey) {
        const client = await this.getClient();
        const valueAsString = this.serializeValue(value);
        await client.hset(this.getRedisKey(key, subKey), hKey, valueAsString);
        return;
    }
    // List operations
    async lpush(key, ...values) {
        const client = await this.getClient();
        const serializedValues = values.map(value => this.serializeValue(value));
        return await client.lPush(this.getRedisKey(key), serializedValues);
    }
    async rpush(key, ...values) {
        const client = await this.getClient();
        const serializedValues = values.map(value => this.serializeValue(value));
        return await client.rPush(this.getRedisKey(key), serializedValues);
    }
    async lpop(key) {
        const client = await this.getClient();
        const reply = await client.lPop(this.getRedisKey(key));
        if (reply == null) {
            return null;
        }
        return this.parseReply(reply);
    }
    async rpop(key) {
        const client = await this.getClient();
        const reply = await client.rPop(this.getRedisKey(key));
        if (reply == null) {
            return null;
        }
        return this.parseReply(reply);
    }
    async llen(key) {
        const client = await this.getClient();
        return await client.lLen(this.getRedisKey(key));
    }
    async lrange(key, start, stop) {
        const client = await this.getClient();
        const replies = await client.lRange(this.getRedisKey(key), start, stop);
        if (replies == null) {
            return [];
        }
        const results = [];
        for (const reply of replies) {
            const result = this.parseReply(reply);
            if (result != null) {
                results.push(result);
            }
        }
        return results;
    }
    async lindex(key, index) {
        const client = await this.getClient();
        const reply = await client.lIndex(this.getRedisKey(key), index);
        if (reply == null) {
            return null;
        }
        return this.parseReply(reply);
    }
    async lset(key, index, value) {
        const client = await this.getClient();
        const valueAsString = this.serializeValue(value);
        await client.lSet(this.getRedisKey(key), index, valueAsString);
        return;
    }
    async lrem(key, count, value) {
        const client = await this.getClient();
        const valueAsString = this.serializeValue(value);
        return await client.lRem(this.getRedisKey(key), count, valueAsString);
    }
    async ltrim(key, start, stop) {
        const client = await this.getClient();
        await client.lTrim(this.getRedisKey(key), start, stop);
        return;
    }
}
exports.RedisCommon = RedisCommon;
