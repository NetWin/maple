import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_AT: Method<string> = method(String.prototype.at.length, (s, [index]) =>
  s.at(toNumber(index))
);
