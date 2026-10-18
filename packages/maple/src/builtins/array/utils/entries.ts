/**
 * Every index below `length` with its element, holes included as `undefined`. The length is
 * fixed when the loop starts and each element is read when the loop reaches it, after the previous
 * callback has run, as JavaScript does for these methods.
 */
export function indexedEntries(array: ReadonlyArray<unknown>): Generator<[number, unknown]> {
  return walk(array, false, false);
}

/** `indexedEntries` from the last index down. */
export function indexedEntriesFromEnd(array: ReadonlyArray<unknown>): Generator<[number, unknown]> {
  return walk(array, true, false);
}

/**
 * The elements that are there, which is what most callback methods visit: an index is skipped
 * when it is a hole at the moment the loop reaches it, so an element a callback deleted is not
 * visited.
 */
export function presentEntries(array: ReadonlyArray<unknown>): Generator<[number, unknown]> {
  return walk(array, false, true);
}

/** `presentEntries` from the last index down. */
export function presentEntriesFromEnd(array: ReadonlyArray<unknown>): Generator<[number, unknown]> {
  return walk(array, true, true);
}

function* walk(
  array: ReadonlyArray<unknown>,
  fromEnd: boolean,
  skipHoles: boolean
): Generator<[number, unknown]> {
  const length = array.length;
  for (let step = 0; step < length; step++) {
    const index = fromEnd ? length - 1 - step : step;
    if (!skipHoles || Object.hasOwn(array, index)) {
      yield [index, array[index]];
    }
  }
}
