import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_COSH: NativeFunction = new NativeFunction(
  'cosh',
  Math.cosh.length,
  (_, [x]) => Math.cosh(toNumber(x))
);
