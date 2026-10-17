import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_MAX: NativeFunction = new NativeFunction(
  'max',
  Math.max.length,
  (values) => Math.max(...values.map(toNumber))
);
