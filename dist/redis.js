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
    constructor(config, category) {
        this.config = config;
        this.category = category;
    }
    getClient() {
        if (this.createPromise == null) {
            this.createPromise = new Promise((resolve, reject) => {
                let isFinished = false;
                const client = (0, redis_1.createClient)(this.config);
                client.on('error', (err) => {
                    try {
                        client.close();
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
            });
        }
        else {
            return this.createPromise;
        }
        return this.createPromise;
    }
    async set(key, value, durationInSeconds) {
        const client = await this.getClient();
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
        await client.set(this.getRedisKey(key), valueAsString, durationInSeconds != null ? {
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
    async get(key) {
        const client = await this.getClient();
        const reply = await client.get(this.getRedisKey(key));
        if (reply == null) {
            throw new KeyNotExistError_1.KeyNotExistError(this.getRedisKey(key));
        }
        return this.parseReply(reply);
    }
    async del(key) {
        const client = await this.getClient();
        return (await client.del(this.getRedisKey(key))) > 0;
    }
    getRedisKey(key) {
        return `${this.category}_${key}`;
    }
    async hget(key, field) {
        const client = await this.getClient();
        const reply = await client.hget(this.getRedisKey(key), field);
        if (reply == null) {
            throw new KeyNotExistError_1.KeyNotExistError(this.getRedisKey(key));
        }
        return this.parseReply(reply);
    }
    async hdel(key, field) {
        const client = await this.getClient();
        const reply = await client.hdel(this.getRedisKey(key), field);
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
    async exists(key) {
        const client = await this.getClient();
        return (await client.exists(this.getRedisKey(key))) > 0;
    }
    async hset(key, field, value) {
        const client = await this.getClient();
        const valueAsString = this.serializeValue(value);
        await client.hset(this.getRedisKey(key), field, valueAsString);
        return;
    }
}
exports.RedisCommon = RedisCommon;
