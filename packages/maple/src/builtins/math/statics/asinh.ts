import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ASINH: NativeFunction = new NativeFunction(
  'asinh',
  Math.asinh.length,
  (_, [x]) => Math.asinh(toNumber(x))
);
