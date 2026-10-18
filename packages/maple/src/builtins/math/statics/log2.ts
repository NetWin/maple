import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_LOG2: NativeFunction = new NativeFunction(
  'log2',
  Math.log2.length,
  (_, [x]) => Math.log2(toNumber(x))
);
