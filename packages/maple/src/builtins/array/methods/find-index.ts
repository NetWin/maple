import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntries } from '../utils/entries.ts';
import { findEntryBy } from '../utils/find-entry-by.ts';

export const ARRAY_METHOD_FIND_INDEX: Method<Array<unknown>> = method(
  Array.prototype.findIndex.length,
  (a, [fn, thisArg], context) =>
    findEntryBy(a, indexedEntries(a), arrayCallback(fn, context, thisArg), true)?.[0] ?? -1
);
