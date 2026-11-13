import { method, type Method } from '../../../values/native.ts';
import { splice } from '../utils/splice.ts';

export const ARRAY_METHOD_TO_SPLICED: Method<Array<unknown>> = method(
  () => Array.prototype.toSpliced.length,
  (a, args) => {
    // `call` is typed by the last overload, which takes no items, so the one with items gets its own
    const toSplicedWithItems: (
      this: ReadonlyArray<unknown>,
      start: number,
      skipCount: number,
      ...items: Array<unknown>
    ) => Array<unknown> = Array.prototype.toSpliced;

    return splice(a, args, (start, count, items) => {
      return count === undefined
        ? Array.prototype.toSpliced.call(a, start)
        : toSplicedWithItems.call(a, start, count, ...items);
    });
  }
);
