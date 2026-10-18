import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntriesFromEnd } from '../utils/entries.ts';
import { findEntryBy } from '../utils/find-entry-by.ts';

export const ARRAY_METHOD_FIND_LAST_INDEX: Method<Array<unknown>> = method(
  Array.prototype.findLastIndex.length,
  (a, [fn], context) =>
    findEntryBy(a, indexedEntriesFromEnd(a), arrayCallback(fn, context), true)?.[0] ?? -1
);
