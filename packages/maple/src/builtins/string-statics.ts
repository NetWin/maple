import { toNumber } from '../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../values/native.ts';

/** The `String.*` functions; `fromCodePoint` throws a catchable `RangeError` for bad code points. */
export const STRING_STATICS: Readonly<Record<string, unknown>> = {
  fromCharCode: new NativeFunction('fromCharCode', (codes) =>
    codes.map((code) => String.fromCharCode(toNumber(code))).join('')
  ),
  fromCodePoint: new NativeFunction('fromCodePoint', (codes, { fail }) =>
    guardHostErrors(fail, () => codes.map((code) => String.fromCodePoint(toNumber(code))).join(''))
  )
};
