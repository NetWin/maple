import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_POP: Method<Array<unknown>> = method(
  Array.prototype.pop.length,
  (a, _args, context) => asMutableArrayOrThrow(a, context, 'pop').pop()
);
