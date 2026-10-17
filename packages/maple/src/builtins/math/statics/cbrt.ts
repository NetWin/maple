import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_CBRT: NativeFunction = new NativeFunction(
  'cbrt',
  Math.cbrt.length,
  ([x]) => Math.cbrt(toNumber(x))
);
