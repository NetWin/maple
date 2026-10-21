import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';

export const ARRAY_METHOD_MAP: Method<Array<unknown>> = method(
  Array.prototype.map.length,
  (a, [fn, thisArg], context) => {
    const call = arrayCallback(fn, context, thisArg);
    // The result keeps the holes of the source, which the callback never sees
    const result: Array<unknown> = [];
    result.length = a.length;
    for (const [index, element] of presentEntries(a)) {
      result[index] = call(element, index, a);
    }
    return result;
  }
);
