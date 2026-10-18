import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_LAST_INDEX_OF: Method<Array<unknown>> = method(
  Array.prototype.lastIndexOf.length,
  (a, args) =>
    args.length < 2 ? a.lastIndexOf(args[0]) : a.lastIndexOf(args[0], toNumber(args[1]))
);
