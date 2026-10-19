import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_REVERSE: Method<Array<unknown>> = method(
  Array.prototype.reverse.length,
  (a, _args, context) =>
    // The host's own reverse runs no script code and keeps holes where JavaScript puts them
    // oxlint-disable-next-line unicorn/no-array-reverse - reversing in place is what this method does
    guardIntegrityErrors(context.fail, a, () => a.reverse())
);
