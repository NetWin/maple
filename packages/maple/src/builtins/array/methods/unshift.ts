import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_UNSHIFT: Method<Array<unknown>> = method(
  Array.prototype.unshift.length,
  (a, items, context) =>
    guardHostErrors(context.fail, () =>
      guardIntegrityErrors(context.fail, a, () => Array.prototype.unshift.call(a, ...items))
    )
);
