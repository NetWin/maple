import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_FROUND: NativeFunction = new NativeFunction(
  'fround',
  Math.fround.length,
  ([x]) => Math.fround(toNumber(x))
);
