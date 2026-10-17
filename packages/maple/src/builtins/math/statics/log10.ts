import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_LOG10: NativeFunction = new NativeFunction(
  'log10',
  Math.log10.length,
  (_, [x]) => Math.log10(toNumber(x))
);
