import { optionalNumber } from '../values/arguments.ts';
import { toString } from '../values/coercion.ts';
import { NativeFunction } from '../values/native.ts';

/**
 * The `Number.*` functions and constants. `parseInt` and `parseFloat` are the same functions as
 * the globals, as in the language; the predicates take the value as is and never coerce.
 */
export const NUMBER_STATICS: Readonly<Record<string, number | NativeFunction>> = {
  MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  MAX_VALUE: Number.MAX_VALUE,
  MIN_VALUE: Number.MIN_VALUE,
  EPSILON: Number.EPSILON,
  POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
  NEGATIVE_INFINITY: Number.NEGATIVE_INFINITY,
  NaN: Number.NaN,
  isInteger: new NativeFunction('isInteger', Number.isInteger.length, ([value]) =>
    Number.isInteger(value)
  ),
  isFinite: new NativeFunction('isFinite', Number.isFinite.length, ([value]) =>
    Number.isFinite(value)
  ),
  isNaN: new NativeFunction('isNaN', Number.isNaN.length, ([value]) => Number.isNaN(value)),
  isSafeInteger: new NativeFunction('isSafeInteger', Number.isSafeInteger.length, ([value]) =>
    Number.isSafeInteger(value)
  ),
  parseFloat: new NativeFunction('parseFloat', Number.parseFloat.length, ([text]) =>
    parseFloat(toString(text))
  ),
  parseInt: new NativeFunction('parseInt', Number.parseInt.length, ([text, radix]) =>
    parseInt(toString(text), optionalNumber(radix))
  )
};
