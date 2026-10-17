import { optionalNumberArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_TO_PRECISION: Method<number> = method(
  Number.prototype.toPrecision.length,
  (n, [precision], { fail }) =>
    guardHostErrors(fail, () => n.toPrecision(optionalNumberArgument(precision)))
);
