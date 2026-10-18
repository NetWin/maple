import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_VALUE_OF: Method<string> = method(
  String.prototype.valueOf.length,
  (s) => s
);
