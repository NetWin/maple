import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_SIN: NativeFunction = new NativeFunction(
  'sin',
  Math.sin.length,
  (_, [x]) => Math.sin(toNumber(x))
);
