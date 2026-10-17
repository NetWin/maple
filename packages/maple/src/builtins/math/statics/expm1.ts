import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_EXPM1: NativeFunction = new NativeFunction(
  'expm1',
  Math.expm1.length,
  ([x]) => Math.expm1(toNumber(x))
);
