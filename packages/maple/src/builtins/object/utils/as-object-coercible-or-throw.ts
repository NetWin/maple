import type { Fail } from '../../../values/members.ts';

/** Ensures that a value is coercible to an object, throwing a TypeError if it is null or undefined. */
export function asObjectCoercibleOrThrow(value: unknown, fail: Fail): unknown {
  if (value === undefined || value === null) {
    return fail('TypeError', `Cannot convert ${String(value)} to object`);
  }
  return value;
}
