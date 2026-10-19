import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_INCLUDES: Method<Array<unknown>> = method(
  Array.prototype.includes.length,
  (a, [value, from]) => Array.prototype.includes.call(a, value, optionalNumberArgument(from))
);
