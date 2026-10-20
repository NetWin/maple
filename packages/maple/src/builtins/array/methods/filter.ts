import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';

export const ARRAY_METHOD_FILTER: Method<Array<unknown>> = method(
  Array.prototype.filter.length,
  (a, [fn, thisArg], context) => {
    const call = arrayCallback(fn, context, thisArg);
    const result: Array<unknown> = [];
    for (const [index, element] of presentEntries(a)) {
      if (call(element, index, a)) {
        result.push(element);
      }
    }
    return result;
  }
);
