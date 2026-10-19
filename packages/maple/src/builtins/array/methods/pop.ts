import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_POP: Method<Array<unknown>> = method(
  Array.prototype.pop.length,
  (a, _args, context) => guardIntegrityErrors(context.fail, a, () => a.pop())
);
