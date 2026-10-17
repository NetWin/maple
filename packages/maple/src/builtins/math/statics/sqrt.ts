import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_SQRT: NativeFunction = new NativeFunction(
  'sqrt',
  Math.sqrt.length,
  ([x]) => Math.sqrt(toNumber(x))
);
