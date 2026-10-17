import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_EXP: NativeFunction = new NativeFunction('exp', Math.exp.length, ([x]) =>
  Math.exp(toNumber(x))
);
