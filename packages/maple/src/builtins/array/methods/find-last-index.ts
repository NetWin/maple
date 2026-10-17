import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntries } from '../utils/entries.ts';
import { findIndexBy } from '../utils/find-index-by.ts';

export const ARRAY_METHOD_FIND_LAST_INDEX: Method<Array<unknown>> = method(
  Array.prototype.findLastIndex.length,
  (a, [fn], context) => {
    return findIndexBy(a, indexedEntries(a).toReversed(), arrayCallback(fn, context), true);
  }
);
