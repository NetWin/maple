import { optionalStringArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_PAD_START: Method<string> = method(
  String.prototype.padStart.length,
  (s, [length, fill], { fail }) =>
    guardHostErrors(fail, () => s.padStart(toNumber(length), optionalStringArgument(fill)))
);
