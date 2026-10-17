import { method, type Method } from '../../../values/native.ts';

export const BOOLEAN_METHOD_TO_STRING: Method<boolean> = method(
  Boolean.prototype.toString.length,
  (b) => String(b)
);
