import type { ArrayCallback } from './array-callback.ts';

/**
 * The first of `entries` whose callback result has truthiness `truthy`, as `[index, element]`
 * with the element the callback was given, or `undefined` when there is none.
 */
export function findEntryBy(
  array: ReadonlyArray<unknown>,
  entries: Iterable<[number, unknown]>,
  call: ArrayCallback,
  truthy: boolean
): [number, unknown] | undefined {
  for (const [index, element] of entries) {
    if (Boolean(call(element, index, array)) === truthy) {
      return [index, element];
    }
  }
  return undefined;
}
