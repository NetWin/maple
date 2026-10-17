import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_TRUNC: NativeFunction = new NativeFunction(
  'trunc',
  Math.trunc.length,
  ([x]) => Math.trunc(toNumber(x))
);
