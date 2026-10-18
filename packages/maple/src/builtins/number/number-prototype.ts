import { Prototype } from '../../values/prototype.ts';
import { NUMBER_METHOD_TO_EXPONENTIAL } from './methods/to-exponential.ts';
import { NUMBER_METHOD_TO_FIXED } from './methods/to-fixed.ts';
import { NUMBER_METHOD_TO_LOCALE_STRING } from './methods/to-locale-string.ts';
import { NUMBER_METHOD_TO_PRECISION } from './methods/to-precision.ts';
import { NUMBER_METHOD_TO_STRING } from './methods/to-string.ts';
import { NUMBER_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * The host throws `RangeError` for digits or a radix out of range, and `Intl` also `TypeError` for
 * inconsistent options; the script can catch either.
 */
export const NUMBER_PROTOTYPE: Prototype<number> = new Prototype(
  'Number',
  (value): value is number => typeof value === 'number',
  {
    toExponential: NUMBER_METHOD_TO_EXPONENTIAL,
    toFixed: NUMBER_METHOD_TO_FIXED,
    toLocaleString: NUMBER_METHOD_TO_LOCALE_STRING,
    toPrecision: NUMBER_METHOD_TO_PRECISION,
    toString: NUMBER_METHOD_TO_STRING,
    valueOf: NUMBER_METHOD_VALUE_OF
  }
);
