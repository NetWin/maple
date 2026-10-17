import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ATAN2: NativeFunction = new NativeFunction(
  'atan2',
  Math.atan2.length,
  ([y, x]) => Math.atan2(toNumber(y), toNumber(x))
);
