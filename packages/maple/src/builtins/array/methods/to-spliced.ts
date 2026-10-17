import { method, type Method } from '../../../values/native.ts';
import { splice } from '../utils/splice.ts';

export const ARRAY_METHOD_TO_SPLICED: Method<Array<unknown>> = method(
  Array.prototype.toSpliced.length,
  (a, args) => {
    return splice(a, args, (start, count, items) => {
      return count === undefined ? a.toSpliced(start) : a.toSpliced(start, count, ...items);
    });
  }
);
