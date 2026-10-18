import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TRIM_END: Method<string> = method(String.prototype.trimEnd.length, (s) =>
  s.trimEnd()
);
