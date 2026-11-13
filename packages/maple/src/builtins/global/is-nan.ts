import { toNumber } from '../../values/coercion.ts';
import { NativeFunction } from '../../values/native.ts';

/** The global `isNaN`, which converts its argument to a number first, unlike `Number.isNaN`. */
export const GLOBAL_IS_NAN: NativeFunction = new NativeFunction(
  'isNaN',
  () => isNaN.length,
  (_, [value]) => Number.isNaN(toNumber(value))
);
