import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';

export const ARRAY_METHOD_POP: Method<Array<unknown>> = method(
  Array.prototype.pop.length,
  (a, _args, context) => guardIntegrityErrors(context.fail, a, () => a.pop())
);
