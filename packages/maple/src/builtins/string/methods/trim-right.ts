import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TRIM_RIGHT: Method<string> = method(
  // oxlint-disable-next-line typescript/no-deprecated
  String.prototype.trimRight.length,
  (s) => s.trimEnd()
);
