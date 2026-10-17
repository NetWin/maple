import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_INDEX_OF: Method<Array<unknown>> = method(
  Array.prototype.indexOf.length,
  (a, [value, from]) => a.indexOf(value, optionalNumberArgument(from))
);
