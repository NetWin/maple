import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_IS_WELL_FORMED: Method<string> = method(
  String.prototype.isWellFormed.length,
  (s) => s.isWellFormed()
);
