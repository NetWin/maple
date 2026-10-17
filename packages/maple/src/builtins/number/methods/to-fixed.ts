import { optionalNumberArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_TO_FIXED: Method<number> = method(
  Number.prototype.toFixed.length,
  (n, [digits], { fail }) => guardHostErrors(fail, () => n.toFixed(optionalNumberArgument(digits)))
);
