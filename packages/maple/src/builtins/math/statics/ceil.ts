import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_CEIL: NativeFunction = new NativeFunction(
  'ceil',
  Math.ceil.length,
  ([x]) => Math.ceil(toNumber(x))
);
