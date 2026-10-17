import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_LOWER_CASE: Method<string> = method(
  String.prototype.toLowerCase.length,
  (s) => s.toLowerCase()
);
