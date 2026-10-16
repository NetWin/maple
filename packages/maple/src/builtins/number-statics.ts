import { optionalNumber } from '../values/arguments.ts';
import { toString } from '../values/coercion.ts';
import { NativeFunction } from '../values/native.ts';

/**
 * The `Number.*` functions and constants. `parseInt` and `parseFloat` are the same functions as
 * the globals, as in the language; the predicates take the value as is and never coerce.
 */
export const NUMBER_STATICS: Readonly<Record<string, unknown>> = {
  isInteger: new NativeFunction('isInteger', ([value]) => Number.isInteger(value)),
  isFinite: new NativeFunction('isFinite', ([value]) => Number.isFinite(value)),
  isNaN: new NativeFunction('isNaN', ([value]) => Number.isNaN(value)),
  isSafeInteger: new NativeFunction('isSafeInteger', ([value]) => Number.isSafeInteger(value)),
  parseFloat: new NativeFunction('parseFloat', ([text]) => parseFloat(toString(text))),
  parseInt: new NativeFunction('parseInt', ([text, radix]) =>
    parseInt(toString(text), optionalNumber(radix))
  ),
  MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  MAX_VALUE: Number.MAX_VALUE,
  MIN_VALUE: Number.MIN_VALUE,
  EPSILON: Number.EPSILON,
  POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
  NEGATIVE_INFINITY: Number.NEGATIVE_INFINITY,
  NaN: Number.NaN
};
