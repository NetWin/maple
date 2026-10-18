import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_UPPER_CASE: Method<string> = method(
  String.prototype.toUpperCase.length,
  (s) => s.toUpperCase()
);
