import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ATAN: NativeFunction = new NativeFunction(
  'atan',
  Math.atan.length,
  ([x]) => Math.atan(toNumber(x))
);
