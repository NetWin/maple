import { toNumber } from '../../../values/coercion.ts';

/** `splice()` removes nothing and `splice(start)` removes to the end, which only the arity tells. */
export function splice(
  array: Array<unknown>,
  args: ReadonlyArray<unknown>,
  apply: (start: number, count: number | undefined, items: ReadonlyArray<unknown>) => Array<unknown>
): Array<unknown> {
  if (args.length === 0) {
    return apply(array.length, 0, []);
  }
  const [start, count, ...items] = args;
  return apply(toNumber(start), args.length === 1 ? undefined : toNumber(count), items);
}
