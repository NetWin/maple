import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';
import { splice } from '../utils/splice.ts';

export const ARRAY_METHOD_SPLICE: Method<Array<unknown>> = method(
  Array.prototype.splice.length,
  (a, args, context) => {
    return splice(a, args, (start, count, items) => {
      return guardIntegrityErrors(context.fail, a, () =>
        count === undefined ? a.splice(start) : a.splice(start, count, ...items)
      );
    });
  }
);
