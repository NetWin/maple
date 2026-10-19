import { guardIntegrityErrors } from '../../../values/guard-integrity-errors.ts';
import { method, type Method } from '../../../values/native.ts';
import { comparator } from '../utils/comparator.ts';
import { presentEntries } from '../utils/entries.ts';

export const ARRAY_METHOD_SORT: Method<Array<unknown>> = method(
  Array.prototype.sort.length,
  (a, [fn], context) => {
    const length = a.length;
    // Only the elements that are there get sorted, all collected before the first comparison as
    // JavaScript does, and the comparator, which is script code, runs on the copy before the
    // guarded write
    const sorted = Array.from(presentEntries(a), ([, value]) => value).toSorted(
      comparator(fn, context)
    );
    return guardIntegrityErrors(context.fail, a, () => {
      for (const [index, value] of sorted.entries()) {
        a[index] = value;
      }
      // The holes move to the end, as JavaScript leaves them. This cannot fail: an element left
      // past the sorted ones means a hole before them, and on an array that is no longer
      // extensible, writing that hole has already thrown
      for (let index = sorted.length; index < length; index++) {
        Reflect.deleteProperty(a, index);
      }
      return a;
    });
  }
);
