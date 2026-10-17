import { guardHostErrors, method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';

export const ARRAY_METHOD_UNSHIFT: Method<Array<unknown>> = method(
  Array.prototype.unshift.length,
  (a, items, context) =>
    guardHostErrors(context.fail, () =>
      guardIntegrityErrors(context.fail, a, () => a.unshift(...items))
    )
);
