import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';
import { comparator } from '../utils/comparator.ts';
import { replaceContents } from '../utils/replace-contents.ts';

export const ARRAY_METHOD_SORT: Method<Array<unknown>> = method(
  Array.prototype.sort.length,
  (a, [fn], context) =>
    replaceContents(asMutableArrayOrThrow(a, context, 'sort'), a.toSorted(comparator(fn, context)))
);
