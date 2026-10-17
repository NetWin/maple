/**
 * Every index below `length` with its element, holes included as `undefined`.
 * The length is fixed when the loop starts, as the language specifies for these methods.
 */
export function indexedEntries(array: ReadonlyArray<unknown>): Array<[number, unknown]> {
  const entries: Array<[number, unknown]> = [];
  for (let index = 0; index < array.length; index++) {
    entries.push([index, array[index]]);
  }
  return entries;
}

/** The elements that are there, which is what most callback methods visit: holes are skipped. */
export function presentEntries(array: ReadonlyArray<unknown>): Array<[number, unknown]> {
  return indexedEntries(array).filter(([index]) => Object.hasOwn(array, index));
}
