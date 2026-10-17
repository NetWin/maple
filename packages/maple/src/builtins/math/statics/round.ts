import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ROUND: NativeFunction = new NativeFunction(
  'round',
  Math.round.length,
  ([x]) => Math.round(toNumber(x))
);
