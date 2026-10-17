import { method, type Method } from '../../../values/native.ts';

export const FUNCTION_METHOD_VALUE_OF: Method<unknown> = method(
  Function.prototype.valueOf.length,
  (fn) => fn
);
