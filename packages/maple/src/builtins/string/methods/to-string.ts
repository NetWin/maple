import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_STRING: Method<string> = method(
  String.prototype.toString.length,
  (s) => s
);
