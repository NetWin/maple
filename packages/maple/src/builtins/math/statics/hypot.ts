import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_HYPOT: NativeFunction = new NativeFunction(
  'hypot',
  Math.hypot.length,
  (_, values) => Math.hypot(...values.map(toNumber))
);
