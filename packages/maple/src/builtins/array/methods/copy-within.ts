import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_COPY_WITHIN: Method<Array<unknown>> = method(
  Array.prototype.copyWithin.length,
  (a, [target, start, end], context) => {
    const to = toNumber(target);
    const from = toNumber(start);
    const until = optionalNumberArgument(end);
    return guardIntegrityErrors(context.fail, a, () =>
      Array.prototype.copyWithin.call(a, to, from, until)
    );
  }
);
