import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';

export const ARRAY_METHOD_FOR_EACH: Method<Array<unknown>> = method(
  Array.prototype.forEach.length,
  (a, [fn, thisArg], context) => {
    const call = arrayCallback(fn, context, thisArg);
    for (const [index, element] of presentEntries(a)) {
      call(element, index, a);
    }
    return undefined;
  }
);
