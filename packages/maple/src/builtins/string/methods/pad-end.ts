import { optionalStringArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_PAD_END: Method<string> = method(
  String.prototype.padEnd.length,
  (s, [length, fill], { fail }) =>
    guardHostErrors(fail, () => s.padEnd(toNumber(length), optionalStringArgument(fill)))
);
