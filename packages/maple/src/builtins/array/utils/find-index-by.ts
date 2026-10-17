import type { ArrayCallback } from './array-callback.ts';

/** The first index among `entries` whose callback result has truthiness `truthy`. */
export function findIndexBy(
  array: ReadonlyArray<unknown>,
  entries: ReadonlyArray<[number, unknown]>,
  call: ArrayCallback,
  truthy: boolean
): number {
  for (const [index, element] of entries) {
    if (Boolean(call(element, index, array)) === truthy) {
      return index;
    }
  }
  return -1;
}
