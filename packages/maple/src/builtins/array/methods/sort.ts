import { method, type Method } from '../../../values/native.ts';
import { comparator } from '../utils/comparator.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';
import { replaceContents } from '../utils/replace-contents.ts';

export const ARRAY_METHOD_SORT: Method<Array<unknown>> = method(
  Array.prototype.sort.length,
  (a, [fn], context) => {
    // The comparator is script code, so it runs on the copy, before the guarded write
    const sorted = a.toSorted(comparator(fn, context));
    return guardIntegrityErrors(context.fail, a, () => replaceContents(a, sorted));
  }
);
