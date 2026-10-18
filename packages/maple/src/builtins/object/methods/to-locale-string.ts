import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const OBJECT_METHOD_TO_LOCALE_STRING: Method<Record<string, unknown>> = method(
  Object.prototype.toLocaleString.length,
  (o) => toString(o)
);
