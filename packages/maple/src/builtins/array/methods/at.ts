import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_AT: Method<Array<unknown>> = method(
  Array.prototype.at.length,
  (a, [index]) => a.at(toNumber(index))
);
