/** An object with no prototype at all, such as return values of `Object.create(null)`. */
export function isPrototypeless(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === null;
}

/** Objects whose own properties are all there is: ordinary literals and parsed JSON. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
