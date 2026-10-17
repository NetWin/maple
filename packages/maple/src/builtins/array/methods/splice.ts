import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';
import { splice } from '../utils/splice.ts';

export const ARRAY_METHOD_SPLICE: Method<Array<unknown>> = method(
  Array.prototype.splice.length,
  (a, args, context) => {
    return splice(asMutableArrayOrThrow(a, context, 'splice'), args, (start, count, items) => {
      return count === undefined ? a.splice(start) : a.splice(start, count, ...items);
    });
  }
);
