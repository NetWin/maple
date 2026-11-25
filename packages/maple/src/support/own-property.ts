/** Adds an own property while building a value; defineProperty keeps `__proto__` data. */
export function defineOwn(target: object, key: string, value: unknown): void {
  // Nothing on the chain answers to `key`, so assignment creates the same own data property,
  // and no setter can run
  if (!(key in target)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- any object takes a string key, and the `in` check above is the real guard
    (target as Record<string, unknown>)[key] = value;
    return;
  }

  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true
  });
}

/**
 * The target's own data value under `key`, or `undefined` when the key is missing, inherited or an
 * accessor. Reading own data keeps a visit from falling through to the host prototype when a key
 * is no longer own.
 */
export function ownDataValue(target: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (descriptor === undefined || !('value' in descriptor)) {
    return undefined;
  }
  return descriptor.value;
}
