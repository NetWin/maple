import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_TAN: NativeFunction = new NativeFunction(
  'tan',
  Math.tan.length,
  (_, [x]) => Math.tan(toNumber(x))
);
