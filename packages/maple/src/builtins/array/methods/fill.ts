import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';

export const ARRAY_METHOD_FILL: Method<Array<unknown>> = method(
  Array.prototype.fill.length,
  (a, [value, start, end], context) => {
    const from = optionalNumberArgument(start);
    const to = optionalNumberArgument(end);
    return guardIntegrityErrors(context.fail, a, () => a.fill(value, from, to));
  }
);
