import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';

export const ARRAY_METHOD_SHIFT: Method<Array<unknown>> = method(
  Array.prototype.shift.length,
  (a, _args, context) => guardIntegrityErrors(context.fail, a, () => a.shift())
);
