import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_ACOS: NativeFunction = new NativeFunction(
  'acos',
  Math.acos.length,
  (_, [x]) => Math.acos(toNumber(x))
);
