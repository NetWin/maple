import type { NativeFunction } from '../../values/native.ts';
import { NUMBER_STATIC_IS_FINITE } from './statics/is-finite.ts';
import { NUMBER_STATIC_IS_INTEGER } from './statics/is-integer.ts';
import { NUMBER_STATIC_IS_NAN } from './statics/is-nan.ts';
import { NUMBER_STATIC_IS_SAFE_INTEGER } from './statics/is-safe-integer.ts';
import { NUMBER_STATIC_PARSE_FLOAT } from './statics/parse-float.ts';
import { NUMBER_STATIC_PARSE_INT } from './statics/parse-int.ts';

/**
 * The `Number.*` functions and constants. `parseInt` and `parseFloat` are the same functions as
 * the globals, as in JavaScript; the predicates take the value as is and never coerce.
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
  isInteger: NUMBER_STATIC_IS_INTEGER,
  isFinite: NUMBER_STATIC_IS_FINITE,
  isNaN: NUMBER_STATIC_IS_NAN,
  isSafeInteger: NUMBER_STATIC_IS_SAFE_INTEGER,
  parseFloat: NUMBER_STATIC_PARSE_FLOAT,
  parseInt: NUMBER_STATIC_PARSE_INT
};
