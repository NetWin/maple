import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_SHIFT: Method<Array<unknown>> = method(
  Array.prototype.shift.length,
  (a, _args, context) => asMutableArrayOrThrow(a, context, 'shift').shift()
);
