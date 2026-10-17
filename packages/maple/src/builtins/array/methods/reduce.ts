import { method, type Method } from '../../../values/native.ts';
import { reduce } from '../utils/reduce.ts';

export const ARRAY_METHOD_REDUCE: Method<Array<unknown>> = method(
  Array.prototype.reduce.length,
  (a, args, context) => reduce(a, args, context, false)
);
