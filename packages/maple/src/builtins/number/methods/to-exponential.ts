import { optionalNumberArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_TO_EXPONENTIAL: Method<number> = method(
  Number.prototype.toExponential.length,
  (n, [digits], { fail }) =>
    guardHostErrors(fail, () => n.toExponential(optionalNumberArgument(digits)))
);
