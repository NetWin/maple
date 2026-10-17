import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_POW: NativeFunction = new NativeFunction(
  'pow',
  Math.pow.length,
  (_, [x, y]) => Math.pow(toNumber(x), toNumber(y))
);
