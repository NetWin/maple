import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

/**
 * `substr` is a legacy method that the host's typings mark as deprecated, so it follows the
 * language's algorithm here: a negative start counts from the end, the length is clamped.
 */
export const STRING_METHOD_SUBSTR: Method<string> = method(
  2 /* deprecated in TypeScript's lib */,
  (s, [start, length]) => {
    const from = toIntegerOrInfinity(start);
    const begin = from < 0 ? Math.max(s.length + from, 0) : Math.min(from, s.length);
    const count = length === undefined ? s.length : toIntegerOrInfinity(length);
    const end = Math.min(begin + Math.min(Math.max(count, 0), s.length), s.length);
    return s.slice(begin, end);
  }
);

function toIntegerOrInfinity(value: unknown): number {
  const number = toNumber(value);
  return Number.isNaN(number) ? 0 : Math.trunc(number);
}
