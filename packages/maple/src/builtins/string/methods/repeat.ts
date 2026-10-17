import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_REPEAT: Method<string> = method(
  String.prototype.repeat.length,
  (s, [count], { fail }) => guardHostErrors(fail, () => s.repeat(toNumber(count)))
);
