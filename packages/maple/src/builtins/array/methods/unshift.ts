import { guardHostErrors, method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_UNSHIFT: Method<Array<unknown>> = method(
  Array.prototype.unshift.length,
  (a, items, context) => {
    return guardHostErrors(context.fail, () => {
      return asMutableArrayOrThrow(a, context, 'unshift').unshift(...items);
    });
  }
);
