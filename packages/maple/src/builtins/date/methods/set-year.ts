import { toNumber } from '../../../values/coercion.ts';
import { type Method, method } from '../../../values/native.ts';
import { asMutableOrThrow, type DateWrapper } from '../../../values/wrappers.ts';

/**
 * The legacy `setYear`, which the host's typings leave out: two-digit years mean 19xx, and an
 * invalid date starts over from the epoch in local time.
 */
export const DATE_METHOD_SET_YEAR: Method<DateWrapper> = method(
  1 /* Annex B, not in TypeScript's lib */,
  (d, [year], { fail }) => {
    const date = asMutableOrThrow(d, fail, 'setYear').date;
    const value = toNumber(year);
    if (Number.isNaN(value)) {
      return date.setTime(Number.NaN);
    }
    const whole = Math.trunc(value);
    if (Number.isNaN(date.getTime())) {
      date.setTime(0);
    }
    return date.setFullYear(whole >= 0 && whole <= 99 ? 1900 + whole : whole);
  }
);
