import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_SIGN: NativeFunction = new NativeFunction(
  'sign',
  Math.sign.length,
  (_, [x]) => Math.sign(toNumber(x))
);
