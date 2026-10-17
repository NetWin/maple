import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntries } from '../utils/entries.ts';
import { findIndexBy } from '../utils/find-index-by.ts';

export const ARRAY_METHOD_FIND_LAST: Method<Array<unknown>> = method(
  Array.prototype.findLast.length,
  (a, [fn], context) => {
    const index = findIndexBy(a, indexedEntries(a).toReversed(), arrayCallback(fn, context), true);
    return a[index];
  }
);
