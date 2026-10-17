import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const OBJECT_METHOD_HAS_OWN_PROPERTY: Method<Record<string, unknown>> = method(
  Object.prototype.hasOwnProperty.length,
  (o, [key]) => Object.hasOwn(o, toString(key))
);
