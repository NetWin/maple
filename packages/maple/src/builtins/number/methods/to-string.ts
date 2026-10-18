import { optionalNumberArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_TO_STRING: Method<number> = method(
  Number.prototype.toString.length,
  (n, [radix], { fail }) => guardHostErrors(fail, () => n.toString(optionalNumberArgument(radix)))
);
