export class KeyNotExistError extends Error {
  constructor(key: string) {
    super(`Key "${key}" does not exist`);
    this.name = 'KeyNotExistError';
  }
}
