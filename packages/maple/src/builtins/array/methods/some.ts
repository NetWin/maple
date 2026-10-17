import { method, type Method } from '../../../values/native.ts';
import { arrayCallback } from '../utils/array-callback.ts';
import { presentEntries } from '../utils/entries.ts';
import { findIndexBy } from '../utils/find-index-by.ts';

export const ARRAY_METHOD_SOME: Method<Array<unknown>> = method(
  Array.prototype.some.length,
  (a, [fn], context) => findIndexBy(a, presentEntries(a), arrayCallback(fn, context), true) !== -1
);
