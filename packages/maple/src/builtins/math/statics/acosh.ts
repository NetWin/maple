import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ACOSH: NativeFunction = new NativeFunction(
  'acosh',
  Math.acosh.length,
  ([x]) => Math.acosh(toNumber(x))
);
