import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_PUSH: Method<Array<unknown>> = method(
  Array.prototype.push.length,
  (a, items, context) =>
    guardHostErrors(context.fail, () =>
      guardIntegrityErrors(context.fail, a, () => a.push(...items))
    )
);
