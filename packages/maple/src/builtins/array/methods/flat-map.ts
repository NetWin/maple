import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';
import { flattenInto } from '../utils/flatten-into.ts';

export const ARRAY_METHOD_FLAT_MAP: Method<Array<unknown>> = method(
  Array.prototype.flatMap.length,
  (a, [fn, thisArg], context) => {
    const call = arrayCallback(fn, context, thisArg);
    const result: Array<unknown> = [];
    for (const [index, element] of presentEntries(a)) {
      const mapped = call(element, index, a);
      if (Array.isArray(mapped)) {
        flattenInto(result, mapped, 0, context);
      } else {
        result.push(mapped);
      }
    }
    return result;
  }
);
