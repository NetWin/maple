import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_LOG: NativeFunction = new NativeFunction('log', Math.log.length, ([x]) =>
  Math.log(toNumber(x))
);
