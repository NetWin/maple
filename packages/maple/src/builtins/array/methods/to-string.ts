import { joinValues } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_TO_STRING: Method<Array<unknown>> = method(
  Array.prototype.toString.length,
  (a) => joinValues(a, ',')
);
