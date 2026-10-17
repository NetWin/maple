import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntries } from '../utils/entries.ts';
import { findIndexBy } from '../utils/find-index-by.ts';

export const ARRAY_METHOD_FIND_INDEX: Method<Array<unknown>> = method(
  Array.prototype.findIndex.length,
  (a, [fn], context) => findIndexBy(a, indexedEntries(a), arrayCallback(fn, context), true)
);
