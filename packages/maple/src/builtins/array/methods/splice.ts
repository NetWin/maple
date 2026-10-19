import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';
import { splice } from '../utils/splice.ts';

// `call` is typed by the last overload, which needs a delete count, so `splice(start)` gets its own
const spliceToEnd: (this: Array<unknown>, start: number) => Array<unknown> = Array.prototype.splice;

export const ARRAY_METHOD_SPLICE: Method<Array<unknown>> = method(
  Array.prototype.splice.length,
  (a, args, context) => {
    return splice(a, args, (start, count, items) => {
      return guardIntegrityErrors(context.fail, a, () =>
        count === undefined
          ? spliceToEnd.call(a, start)
          : Array.prototype.splice.call(a, start, count, ...items)
      );
    });
  }
);
