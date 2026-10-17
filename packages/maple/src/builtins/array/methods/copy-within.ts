import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';

export const ARRAY_METHOD_COPY_WITHIN: Method<Array<unknown>> = method(
  Array.prototype.copyWithin.length,
  (a, [target, start, end], context) => {
    const to = toNumber(target);
    const from = toNumber(start);
    const until = optionalNumberArgument(end);
    return guardIntegrityErrors(context.fail, a, () => a.copyWithin(to, from, until));
  }
);
