import { method, type Method } from '../../../values/native.ts';

export const BOOLEAN_METHOD_VALUE_OF: Method<boolean> = method(
  Boolean.prototype.valueOf.length,
  (b) => b
);
