import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_SLICE: Method<Array<unknown>> = method(
  Array.prototype.slice.length,
  (a, [start, end]) =>
    Array.prototype.slice.call(a, optionalNumberArgument(start), optionalNumberArgument(end))
);
