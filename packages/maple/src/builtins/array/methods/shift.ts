import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_SHIFT: Method<Array<unknown>> = method(
  Array.prototype.shift.length,
  (a, _args, context) => guardIntegrityErrors(context.fail, a, () => Array.prototype.shift.call(a))
);
