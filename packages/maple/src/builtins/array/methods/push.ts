import { guardHostErrors, method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_PUSH: Method<Array<unknown>> = method(
  Array.prototype.push.length,
  (a, items, context) =>
    guardHostErrors(context.fail, () => asMutableArrayOrThrow(a, context, 'push').push(...items))
);
