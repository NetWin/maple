import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { flattenInto } from '../utils/flatten-into.ts';

export const ARRAY_METHOD_FLAT: Method<Array<unknown>> = method(
  Array.prototype.flat.length,
  (a, [depth], context) => {
    const result: Array<unknown> = [];
    const actualDepth = depth === undefined ? 1 : Math.trunc(toNumber(depth)) || 0;
    flattenInto(result, a, actualDepth, context);
    return result;
  }
);
