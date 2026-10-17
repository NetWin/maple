import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ABS: NativeFunction = new NativeFunction('abs', Math.abs.length, ([x]) =>
  Math.abs(toNumber(x))
);
