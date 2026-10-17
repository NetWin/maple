import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_SINH: NativeFunction = new NativeFunction(
  'sinh',
  Math.sinh.length,
  ([x]) => Math.sinh(toNumber(x))
);
