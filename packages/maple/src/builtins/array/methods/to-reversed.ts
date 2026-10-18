import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_TO_REVERSED: Method<Array<unknown>> = method(
  Array.prototype.toReversed.length,
  (a) => a.toReversed()
);
