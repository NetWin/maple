import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_TANH: NativeFunction = new NativeFunction(
  'tanh',
  Math.tanh.length,
  (_, [x]) => Math.tanh(toNumber(x))
);
