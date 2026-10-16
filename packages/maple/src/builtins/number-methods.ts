import { intlOptionsArgument, localesArgument, optionalNumber } from '../values/arguments.ts';
import { guardHostErrors, type Method } from '../values/native.ts';

type NumberMethod = Method<number>;

/** The host throws `RangeError` for digits or a radix out of range; the script can catch it. */
export const NUMBER_METHODS: ReadonlyMap<string, NumberMethod> = new Map<string, NumberMethod>([
  [
    'toExponential',
    (n, [digits], { fail }) => guardHostErrors(fail, () => n.toExponential(optionalNumber(digits)))
  ],
  [
    'toFixed',
    (n, [digits], { fail }) => guardHostErrors(fail, () => n.toFixed(optionalNumber(digits)))
  ],
  [
    'toLocaleString',
    (n, [locales, options], { fail }) =>
      guardHostErrors(fail, () =>
        n.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
      )
  ],
  [
    'toPrecision',
    (n, [precision], { fail }) =>
      guardHostErrors(fail, () => n.toPrecision(optionalNumber(precision)))
  ],
  [
    'toString',
    (n, [radix], { fail }) => guardHostErrors(fail, () => n.toString(optionalNumber(radix)))
  ]
]);
