import { intlOptionsArgument, localesArgument } from '../values/arguments.ts';
import { toNumber } from '../values/coercion.ts';
import {
  type CallContext,
  guardHostErrors,
  guardIntlErrors,
  type Method,
  method,
  type MethodCall
} from '../values/native.ts';
import { asMutableOrThrow, DateWrapper } from '../values/wrappers.ts';

type DateMethod = Method<DateWrapper>;

/**
 * Local-time methods depend on the host's timezone, as the language has it. Setters take only
 * the arguments that were passed, because an explicit `undefined` would make the date invalid.
 */
export const DATE_METHODS: ReadonlyMap<string, DateMethod> = new Map<string, DateMethod>([
  ['getDate', method(Date.prototype.getDate.length, (d) => d.date.getDate())],
  ['getDay', method(Date.prototype.getDay.length, (d) => d.date.getDay())],
  ['getFullYear', method(Date.prototype.getFullYear.length, (d) => d.date.getFullYear())],
  ['getHours', method(Date.prototype.getHours.length, (d) => d.date.getHours())],
  [
    'getMilliseconds',
    method(Date.prototype.getMilliseconds.length, (d) => d.date.getMilliseconds())
  ],
  ['getMinutes', method(Date.prototype.getMinutes.length, (d) => d.date.getMinutes())],
  ['getMonth', method(Date.prototype.getMonth.length, (d) => d.date.getMonth())],
  ['getSeconds', method(Date.prototype.getSeconds.length, (d) => d.date.getSeconds())],
  ['getTime', method(Date.prototype.getTime.length, (d) => d.date.getTime())],
  ['getYear', method(0 /* Annex B, not in TypeScript's lib */, (d) => d.date.getFullYear() - 1900)],
  [
    'getTimezoneOffset',
    method(Date.prototype.getTimezoneOffset.length, (d) => d.date.getTimezoneOffset())
  ],
  ['getUTCDate', method(Date.prototype.getUTCDate.length, (d) => d.date.getUTCDate())],
  ['getUTCDay', method(Date.prototype.getUTCDay.length, (d) => d.date.getUTCDay())],
  ['getUTCFullYear', method(Date.prototype.getUTCFullYear.length, (d) => d.date.getUTCFullYear())],
  ['getUTCHours', method(Date.prototype.getUTCHours.length, (d) => d.date.getUTCHours())],
  [
    'getUTCMilliseconds',
    method(Date.prototype.getUTCMilliseconds.length, (d) => d.date.getUTCMilliseconds())
  ],
  ['getUTCMinutes', method(Date.prototype.getUTCMinutes.length, (d) => d.date.getUTCMinutes())],
  ['getUTCMonth', method(Date.prototype.getUTCMonth.length, (d) => d.date.getUTCMonth())],
  ['getUTCSeconds', method(Date.prototype.getUTCSeconds.length, (d) => d.date.getUTCSeconds())],
  [
    'setDate',
    method(
      Date.prototype.setDate.length,
      setter('setDate', (date) => date.setDate.bind(date))
    )
  ],
  [
    'setFullYear',
    method(
      Date.prototype.setFullYear.length,
      setter('setFullYear', (date) => date.setFullYear.bind(date))
    )
  ],
  [
    'setHours',
    method(
      Date.prototype.setHours.length,
      setter('setHours', (date) => date.setHours.bind(date))
    )
  ],
  [
    'setMilliseconds',
    method(
      Date.prototype.setMilliseconds.length,
      setter('setMilliseconds', (date) => date.setMilliseconds.bind(date))
    )
  ],
  [
    'setMinutes',
    method(
      Date.prototype.setMinutes.length,
      setter('setMinutes', (date) => date.setMinutes.bind(date))
    )
  ],
  [
    'setMonth',
    method(
      Date.prototype.setMonth.length,
      setter('setMonth', (date) => date.setMonth.bind(date))
    )
  ],
  [
    'setSeconds',
    method(
      Date.prototype.setSeconds.length,
      setter('setSeconds', (date) => date.setSeconds.bind(date))
    )
  ],
  [
    'setTime',
    method(
      Date.prototype.setTime.length,
      setter('setTime', (date) => date.setTime.bind(date))
    )
  ],
  [
    'setUTCDate',
    method(
      Date.prototype.setUTCDate.length,
      setter('setUTCDate', (date) => date.setUTCDate.bind(date))
    )
  ],
  [
    'setUTCFullYear',
    method(
      Date.prototype.setUTCFullYear.length,
      setter('setUTCFullYear', (date) => date.setUTCFullYear.bind(date))
    )
  ],
  [
    'setUTCHours',
    method(
      Date.prototype.setUTCHours.length,
      setter('setUTCHours', (date) => date.setUTCHours.bind(date))
    )
  ],
  [
    'setUTCMilliseconds',
    method(
      Date.prototype.setUTCMilliseconds.length,
      setter('setUTCMilliseconds', (date) => date.setUTCMilliseconds.bind(date))
    )
  ],
  [
    'setUTCMinutes',
    method(
      Date.prototype.setUTCMinutes.length,
      setter('setUTCMinutes', (date) => date.setUTCMinutes.bind(date))
    )
  ],
  [
    'setUTCMonth',
    method(
      Date.prototype.setUTCMonth.length,
      setter('setUTCMonth', (date) => date.setUTCMonth.bind(date))
    )
  ],
  [
    'setUTCSeconds',
    method(
      Date.prototype.setUTCSeconds.length,
      setter('setUTCSeconds', (date) => date.setUTCSeconds.bind(date))
    )
  ],
  [
    'setYear',
    method(1 /* Annex B, not in TypeScript's lib */, (d, [year], { fail }) =>
      setYear(asMutableOrThrow(d, fail, 'setYear').date, year)
    )
  ],
  ['toDateString', method(Date.prototype.toDateString.length, (d) => d.date.toDateString())],
  ['toGMTString', method(0 /* Annex B, not in TypeScript's lib */, (d) => d.date.toUTCString())],
  [
    'toISOString',
    method(Date.prototype.toISOString.length, (d, _args, { fail }) =>
      guardHostErrors(fail, () => d.date.toISOString())
    )
  ],
  [
    'toJSON',
    method(Date.prototype.toJSON.length, (d) =>
      Number.isNaN(d.date.getTime()) ? null : d.date.toISOString()
    )
  ],
  [
    'toLocaleDateString',
    method(Date.prototype.toLocaleDateString.length, (d, [locales, options], { fail }) => {
      const tags = localesArgument(locales);
      const intlOptions = intlOptionsArgument(options);
      return guardIntlErrors(fail, () => d.date.toLocaleDateString(tags, intlOptions));
    })
  ],
  [
    'toLocaleString',
    method(Date.prototype.toLocaleString.length, (d, [locales, options], { fail }) => {
      const tags = localesArgument(locales);
      const intlOptions = intlOptionsArgument(options);
      return guardIntlErrors(fail, () => d.date.toLocaleString(tags, intlOptions));
    })
  ],
  [
    'toLocaleTimeString',
    method(Date.prototype.toLocaleTimeString.length, (d, [locales, options], { fail }) => {
      const tags = localesArgument(locales);
      const intlOptions = intlOptionsArgument(options);
      return guardIntlErrors(fail, () => d.date.toLocaleTimeString(tags, intlOptions));
    })
  ],
  ['toString', method(Date.prototype.toString.length, (d) => d.date.toString())],
  ['toTimeString', method(Date.prototype.toTimeString.length, (d) => d.date.toTimeString())],
  ['toUTCString', method(Date.prototype.toUTCString.length, (d) => d.date.toUTCString())],
  ['valueOf', method(Date.prototype.valueOf.length, (d) => d.date.getTime())]
]);

/**
 * The legacy `setYear`, which the host's typings leave out: two-digit years mean 19xx, and an
 * invalid date starts over from the epoch in local time.
 */
function setYear(date: Date, year: unknown): number {
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

function setter(
  name: string,
  pick: (date: Date) => (...values: Array<number>) => number
): MethodCall<DateWrapper> {
  return (d, args, context: CallContext) =>
    pick(asMutableOrThrow(d, context.fail, name).date)(...args.map(toNumber));
}
