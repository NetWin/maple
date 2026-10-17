import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_FLOOR: NativeFunction = new NativeFunction(
  'floor',
  Math.floor.length,
  (_, [x]) => Math.floor(toNumber(x))
);
