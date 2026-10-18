import { method, type Method } from '../../../values/native.ts';
import { comparator } from '../utils/comparator.ts';

export const ARRAY_METHOD_TO_SORTED: Method<Array<unknown>> = method(
  Array.prototype.toSorted.length,
  (a, [fn], context) => a.toSorted(comparator(fn, context))
);
