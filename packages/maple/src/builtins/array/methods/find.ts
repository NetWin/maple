import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { indexedEntries } from '../utils/entries.ts';
import { findEntryBy } from '../utils/find-entry-by.ts';

export const ARRAY_METHOD_FIND: Method<Array<unknown>> = method(
  Array.prototype.find.length,
  (a, [fn], context) => findEntryBy(a, indexedEntries(a), arrayCallback(fn, context), true)?.[1]
);
