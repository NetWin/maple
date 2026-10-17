/** Writes `contents` into `array` in place, which is how `sort` and `reverse` mutate and return it. */
export function replaceContents(
  array: Array<unknown>,
  contents: ReadonlyArray<unknown>
): Array<unknown> {
  for (const [index, element] of contents.entries()) {
    array[index] = element;
  }
  return array;
}
