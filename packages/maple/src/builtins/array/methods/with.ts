import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_WITH: Method<Array<unknown>> = method(
  Array.prototype.with.length,
  (a, [index, value], { fail }) => guardHostErrors(fail, () => a.with(toNumber(index), value))
);
