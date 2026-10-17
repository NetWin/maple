import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_CODE_POINT_AT: Method<string> = method(
  String.prototype.codePointAt.length,
  (s, [index]) => s.codePointAt(toNumber(index))
);
