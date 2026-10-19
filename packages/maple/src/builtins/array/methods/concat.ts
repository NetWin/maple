import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_CONCAT: Method<Array<unknown>> = method(
  Array.prototype.concat.length,
  (a, items, { fail }) => guardHostErrors(fail, () => Array.prototype.concat.call(a, ...items))
);
