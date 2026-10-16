import { intlOptionsArgument, localesArgument, optionalNumber } from '../values/arguments.ts';
import { guardHostErrors, guardIntlErrors, type Method, method } from '../values/native.ts';

type NumberMethod = Method<number>;

/**
 * The host throws `RangeError` for digits or a radix out of range, and `Intl` also `TypeError` for
 * inconsistent options; the script can catch either.
 */
export const NUMBER_METHODS: ReadonlyMap<string, NumberMethod> = new Map<string, NumberMethod>([
  [
    'toExponential',
    method(Number.prototype.toExponential.length, (n, [digits], { fail }) =>
      guardHostErrors(fail, () => n.toExponential(optionalNumber(digits)))
    )
  ],
  [
    'toFixed',
    method(Number.prototype.toFixed.length, (n, [digits], { fail }) =>
      guardHostErrors(fail, () => n.toFixed(optionalNumber(digits)))
    )
  ],
  [
    'toLocaleString',
    method(Number.prototype.toLocaleString.length, (n, [locales, options], { fail }) => {
      const tags = localesArgument(locales);
      const intlOptions = intlOptionsArgument(options);
      return guardIntlErrors(fail, () => n.toLocaleString(tags, intlOptions));
    })
  ],
  [
    'toPrecision',
    method(Number.prototype.toPrecision.length, (n, [precision], { fail }) =>
      guardHostErrors(fail, () => n.toPrecision(optionalNumber(precision)))
    )
  ],
  [
    'toString',
    method(Number.prototype.toString.length, (n, [radix], { fail }) =>
      guardHostErrors(fail, () => n.toString(optionalNumber(radix)))
    )
  ]
]);
