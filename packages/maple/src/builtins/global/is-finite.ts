import { toNumber } from '../../values/coercion.ts';
import { NativeFunction } from '../../values/native.ts';

/** The global `isFinite`, which converts its argument to a number first, unlike `Number.isFinite`. */
export const GLOBAL_IS_FINITE: NativeFunction = new NativeFunction(
  'isFinite',
  () => isFinite.length,
  (_, [value]) => Number.isFinite(toNumber(value))
);
