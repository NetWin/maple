import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../../../values/native.ts';

/** Throws a catchable `RangeError` for bad code points. */
export const STRING_STATIC_FROM_CODE_POINT: NativeFunction = new NativeFunction(
  'fromCodePoint',
  String.fromCodePoint.length,
  (codes, { fail }) =>
    guardHostErrors(fail, () => codes.map((code) => String.fromCodePoint(toNumber(code))).join(''))
);
