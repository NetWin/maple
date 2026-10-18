/** Adds an own property while building a value; defineProperty keeps `__proto__` data. */
export function defineOwn(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true
  });
}
