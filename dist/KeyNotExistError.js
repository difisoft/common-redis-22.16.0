"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyNotExistError = void 0;
class KeyNotExistError extends Error {
    constructor(key) {
        super(`Key "${key}" does not exist`);
        this.name = 'KeyNotExistError';
    }
}
exports.KeyNotExistError = KeyNotExistError;
