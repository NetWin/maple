import { optionalNumberArgument } from '../../../values/arguments.ts';
import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_FILL: Method<Array<unknown>> = method(
  Array.prototype.fill.length,
  (a, [value, start, end], context) => {
    const from = optionalNumberArgument(start);
    const to = optionalNumberArgument(end);
    return guardIntegrityErrors(context.fail, a, () =>
      Array.prototype.fill.call(a, value, from, to)
    );
  }
);
