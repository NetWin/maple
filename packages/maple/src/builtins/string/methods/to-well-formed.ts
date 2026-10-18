import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_WELL_FORMED: Method<string> = method(
  String.prototype.toWellFormed.length,
  (s) => s.toWellFormed()
);
