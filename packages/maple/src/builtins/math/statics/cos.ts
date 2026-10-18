import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_COS: NativeFunction = new NativeFunction(
  'cos',
  Math.cos.length,
  (_, [x]) => Math.cos(toNumber(x))
);
