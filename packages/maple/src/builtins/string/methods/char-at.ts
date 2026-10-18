import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_CHAR_AT: Method<string> = method(
  String.prototype.charAt.length,
  (s, [index]) => s.charAt(toNumber(index))
);
