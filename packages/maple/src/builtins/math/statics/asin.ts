import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ASIN: NativeFunction = new NativeFunction(
  'asin',
  Math.asin.length,
  (_, [x]) => Math.asin(toNumber(x))
);
