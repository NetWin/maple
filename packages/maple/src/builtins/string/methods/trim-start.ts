import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TRIM_START: Method<string> = method(
  String.prototype.trimStart.length,
  (s) => s.trimStart()
);
