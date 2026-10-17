import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_SUBSTRING: Method<string> = method(
  String.prototype.substring.length,
  (s, [start, end]) => s.substring(toNumber(start), optionalNumberArgument(end))
);
