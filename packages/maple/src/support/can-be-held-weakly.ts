/**
 * Whether a value may be a WeakMap key or a WeakSet entry. JavaScript also allows symbols that are
 * not registered, but scripts have no symbols, so it comes down to objects and functions: every
 * Maple object is a host object, while `'a'` or `1` would be a primitive, which nothing holds.
 */
export function canBeHeldWeakly(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}
