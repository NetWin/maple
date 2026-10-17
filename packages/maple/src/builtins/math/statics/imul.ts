import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_IMUL: NativeFunction = new NativeFunction(
  'imul',
  Math.imul.length,
  ([x, y]) => Math.imul(toNumber(x), toNumber(y))
);
