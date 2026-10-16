import { intlOptionsArgument, localesArgument } from '../values/arguments.ts';
import { toNumber } from '../values/coercion.ts';
import { type CallContext, guardHostErrors, type Method } from '../values/native.ts';
import { asMutableOrThrow, DateWrapper } from '../values/wrappers.ts';

type DateMethod = Method<DateWrapper>;

/**
 * Local-time methods depend on the host's timezone, as the language has it. Setters take only
 * the arguments that were passed, because an explicit `undefined` would make the date invalid.
 */
export const DATE_METHODS: ReadonlyMap<string, DateMethod> = new Map<string, DateMethod>([
  ['getDate', (d) => d.date.getDate()],
  ['getDay', (d) => d.date.getDay()],
  ['getFullYear', (d) => d.date.getFullYear()],
  ['getHours', (d) => d.date.getHours()],
  ['getMilliseconds', (d) => d.date.getMilliseconds()],
  ['getMinutes', (d) => d.date.getMinutes()],
  ['getMonth', (d) => d.date.getMonth()],
  ['getSeconds', (d) => d.date.getSeconds()],
  ['getTime', (d) => d.date.getTime()],
  ['getYear', (d) => d.date.getFullYear() - 1900],
  ['getTimezoneOffset', (d) => d.date.getTimezoneOffset()],
  ['getUTCDate', (d) => d.date.getUTCDate()],
  ['getUTCDay', (d) => d.date.getUTCDay()],
  ['getUTCFullYear', (d) => d.date.getUTCFullYear()],
  ['getUTCHours', (d) => d.date.getUTCHours()],
  ['getUTCMilliseconds', (d) => d.date.getUTCMilliseconds()],
  ['getUTCMinutes', (d) => d.date.getUTCMinutes()],
  ['getUTCMonth', (d) => d.date.getUTCMonth()],
  ['getUTCSeconds', (d) => d.date.getUTCSeconds()],
  ['setDate', setter('setDate', (date) => date.setDate.bind(date))],
  ['setFullYear', setter('setFullYear', (date) => date.setFullYear.bind(date))],
  ['setHours', setter('setHours', (date) => date.setHours.bind(date))],
  ['setMilliseconds', setter('setMilliseconds', (date) => date.setMilliseconds.bind(date))],
  ['setMinutes', setter('setMinutes', (date) => date.setMinutes.bind(date))],
  ['setMonth', setter('setMonth', (date) => date.setMonth.bind(date))],
  ['setSeconds', setter('setSeconds', (date) => date.setSeconds.bind(date))],
  ['setTime', setter('setTime', (date) => date.setTime.bind(date))],
  ['setUTCDate', setter('setUTCDate', (date) => date.setUTCDate.bind(date))],
  ['setUTCFullYear', setter('setUTCFullYear', (date) => date.setUTCFullYear.bind(date))],
  ['setUTCHours', setter('setUTCHours', (date) => date.setUTCHours.bind(date))],
  [
    'setUTCMilliseconds',
    setter('setUTCMilliseconds', (date) => date.setUTCMilliseconds.bind(date))
  ],
  ['setUTCMinutes', setter('setUTCMinutes', (date) => date.setUTCMinutes.bind(date))],
  ['setUTCMonth', setter('setUTCMonth', (date) => date.setUTCMonth.bind(date))],
  ['setUTCSeconds', setter('setUTCSeconds', (date) => date.setUTCSeconds.bind(date))],
  ['setYear', (d, [year], { fail }) => setYear(asMutableOrThrow(d, fail, 'setYear').date, year)],
  ['toDateString', (d) => d.date.toDateString()],
  ['toGMTString', (d) => d.date.toUTCString()],
  ['toISOString', (d, _args, { fail }) => guardHostErrors(fail, () => d.date.toISOString())],
  ['toJSON', (d) => (Number.isNaN(d.date.getTime()) ? null : d.date.toISOString())],
  [
    'toLocaleDateString',
    (d, [locales, options], { fail }) =>
      guardHostErrors(fail, () =>
        d.date.toLocaleDateString(localesArgument(locales), intlOptionsArgument(options))
      )
  ],
  [
    'toLocaleString',
    (d, [locales, options], { fail }) =>
      guardHostErrors(fail, () =>
        d.date.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
      )
  ],
  [
    'toLocaleTimeString',
    (d, [locales, options], { fail }) =>
      guardHostErrors(fail, () =>
        d.date.toLocaleTimeString(localesArgument(locales), intlOptionsArgument(options))
      )
  ],
  ['toString', (d) => d.date.toString()],
  ['toTimeString', (d) => d.date.toTimeString()],
  ['toUTCString', (d) => d.date.toUTCString()],
  ['valueOf', (d) => d.date.getTime()]
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
): DateMethod {
  return (d, args, context: CallContext) =>
    pick(asMutableOrThrow(d, context.fail, name).date)(...args.map(toNumber));
}
