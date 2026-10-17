import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TRIM: Method<string> = method(String.prototype.trim.length, (s) =>
  s.trim()
);
