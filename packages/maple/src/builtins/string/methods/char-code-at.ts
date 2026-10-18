import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_CHAR_CODE_AT: Method<string> = method(
  String.prototype.charCodeAt.length,
  (s, [index]) => s.charCodeAt(toNumber(index))
);
