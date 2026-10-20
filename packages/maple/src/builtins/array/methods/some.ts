import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';
import { findEntryBy } from '../utils/find-entry-by.ts';

export const ARRAY_METHOD_SOME: Method<Array<unknown>> = method(
  Array.prototype.some.length,
  (a, [fn, thisArg], context) =>
    findEntryBy(a, presentEntries(a), arrayCallback(fn, context, thisArg), true) !== undefined
);
