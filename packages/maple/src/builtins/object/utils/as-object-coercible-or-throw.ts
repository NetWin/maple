import type { Fail } from '../../../values/members.ts';

export function asObjectCoercibleOrThrow(value: unknown, fail: Fail): unknown {
  if (value === undefined || value === null) {
    return fail('TypeError', `Cannot convert ${String(value)} to object`);
  }
  return value;
}
