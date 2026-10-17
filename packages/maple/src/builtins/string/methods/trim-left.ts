import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TRIM_LEFT: Method<string> = method(
  // oxlint-disable-next-line typescript/no-deprecated
  String.prototype.trimLeft.length,
  (s) => s.trimStart()
);
