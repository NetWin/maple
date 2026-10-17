import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_CLZ32: NativeFunction = new NativeFunction(
  'clz32',
  Math.clz32.length,
  ([x]) => Math.clz32(toNumber(x))
);
