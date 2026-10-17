import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_MIN: NativeFunction = new NativeFunction(
  'min',
  Math.min.length,
  (values) => Math.min(...values.map(toNumber))
);
