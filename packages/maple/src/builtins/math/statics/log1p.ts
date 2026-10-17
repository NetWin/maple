import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_LOG1P: NativeFunction = new NativeFunction(
  'log1p',
  Math.log1p.length,
  ([x]) => Math.log1p(toNumber(x))
);
