import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ATANH: NativeFunction = new NativeFunction(
  'atanh',
  Math.atanh.length,
  ([x]) => Math.atanh(toNumber(x))
);
