import { Prototype } from '../../values/prototype.ts';
import { DateWrapper } from '../../values/wrappers/date-wrapper.ts';
import { DATE_METHOD_GET_DATE } from './methods/get-date.ts';
import { DATE_METHOD_GET_DAY } from './methods/get-day.ts';
import { DATE_METHOD_GET_FULL_YEAR } from './methods/get-full-year.ts';
import { DATE_METHOD_GET_HOURS } from './methods/get-hours.ts';
import { DATE_METHOD_GET_MILLISECONDS } from './methods/get-milliseconds.ts';
import { DATE_METHOD_GET_MINUTES } from './methods/get-minutes.ts';
import { DATE_METHOD_GET_MONTH } from './methods/get-month.ts';
import { DATE_METHOD_GET_SECONDS } from './methods/get-seconds.ts';
import { DATE_METHOD_GET_TIME } from './methods/get-time.ts';
import { DATE_METHOD_GET_TIMEZONE_OFFSET } from './methods/get-timezone-offset.ts';
import { DATE_METHOD_GET_UTC_DATE } from './methods/get-utc-date.ts';
import { DATE_METHOD_GET_UTC_DAY } from './methods/get-utc-day.ts';
import { DATE_METHOD_GET_UTC_FULL_YEAR } from './methods/get-utc-full-year.ts';
import { DATE_METHOD_GET_UTC_HOURS } from './methods/get-utc-hours.ts';
import { DATE_METHOD_GET_UTC_MILLISECONDS } from './methods/get-utc-milliseconds.ts';
import { DATE_METHOD_GET_UTC_MINUTES } from './methods/get-utc-minutes.ts';
import { DATE_METHOD_GET_UTC_MONTH } from './methods/get-utc-month.ts';
import { DATE_METHOD_GET_UTC_SECONDS } from './methods/get-utc-seconds.ts';
import { DATE_METHOD_GET_YEAR } from './methods/get-year.ts';
import { DATE_METHOD_SET_DATE } from './methods/set-date.ts';
import { DATE_METHOD_SET_FULL_YEAR } from './methods/set-full-year.ts';
import { DATE_METHOD_SET_HOURS } from './methods/set-hours.ts';
import { DATE_METHOD_SET_MILLISECONDS } from './methods/set-milliseconds.ts';
import { DATE_METHOD_SET_MINUTES } from './methods/set-minutes.ts';
import { DATE_METHOD_SET_MONTH } from './methods/set-month.ts';
import { DATE_METHOD_SET_SECONDS } from './methods/set-seconds.ts';
import { DATE_METHOD_SET_TIME } from './methods/set-time.ts';
import { DATE_METHOD_SET_UTC_DATE } from './methods/set-utc-date.ts';
import { DATE_METHOD_SET_UTC_FULL_YEAR } from './methods/set-utc-full-year.ts';
import { DATE_METHOD_SET_UTC_HOURS } from './methods/set-utc-hours.ts';
import { DATE_METHOD_SET_UTC_MILLISECONDS } from './methods/set-utc-milliseconds.ts';
import { DATE_METHOD_SET_UTC_MINUTES } from './methods/set-utc-minutes.ts';
import { DATE_METHOD_SET_UTC_MONTH } from './methods/set-utc-month.ts';
import { DATE_METHOD_SET_UTC_SECONDS } from './methods/set-utc-seconds.ts';
import { DATE_METHOD_SET_YEAR } from './methods/set-year.ts';
import { DATE_METHOD_TO_DATE_STRING } from './methods/to-date-string.ts';
import { DATE_METHOD_TO_GMT_STRING } from './methods/to-gmt-string.ts';
import { DATE_METHOD_TO_ISO_STRING } from './methods/to-iso-string.ts';
import { DATE_METHOD_TO_JSON } from './methods/to-json.ts';
import { DATE_METHOD_TO_LOCALE_DATE_STRING } from './methods/to-locale-date-string.ts';
import { DATE_METHOD_TO_LOCALE_STRING } from './methods/to-locale-string.ts';
import { DATE_METHOD_TO_LOCALE_TIME_STRING } from './methods/to-locale-time-string.ts';
import { DATE_METHOD_TO_STRING } from './methods/to-string.ts';
import { DATE_METHOD_TO_TIME_STRING } from './methods/to-time-string.ts';
import { DATE_METHOD_TO_UTC_STRING } from './methods/to-utc-string.ts';
import { DATE_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * Local-time methods depend on the host's timezone, as the language has it. Setters take only
 * the arguments that were passed, because an explicit `undefined` would make the date invalid.
 */
export const DATE_PROTOTYPE: Prototype<DateWrapper> = new Prototype(
  'Date',
  (value): value is DateWrapper => value instanceof DateWrapper,
  {
    getDate: DATE_METHOD_GET_DATE,
    getDay: DATE_METHOD_GET_DAY,
    getFullYear: DATE_METHOD_GET_FULL_YEAR,
    getHours: DATE_METHOD_GET_HOURS,
    getMilliseconds: DATE_METHOD_GET_MILLISECONDS,
    getMinutes: DATE_METHOD_GET_MINUTES,
    getMonth: DATE_METHOD_GET_MONTH,
    getSeconds: DATE_METHOD_GET_SECONDS,
    getTime: DATE_METHOD_GET_TIME,
    getYear: DATE_METHOD_GET_YEAR,
    getTimezoneOffset: DATE_METHOD_GET_TIMEZONE_OFFSET,
    getUTCDate: DATE_METHOD_GET_UTC_DATE,
    getUTCDay: DATE_METHOD_GET_UTC_DAY,
    getUTCFullYear: DATE_METHOD_GET_UTC_FULL_YEAR,
    getUTCHours: DATE_METHOD_GET_UTC_HOURS,
    getUTCMilliseconds: DATE_METHOD_GET_UTC_MILLISECONDS,
    getUTCMinutes: DATE_METHOD_GET_UTC_MINUTES,
    getUTCMonth: DATE_METHOD_GET_UTC_MONTH,
    getUTCSeconds: DATE_METHOD_GET_UTC_SECONDS,
    setDate: DATE_METHOD_SET_DATE,
    setFullYear: DATE_METHOD_SET_FULL_YEAR,
    setHours: DATE_METHOD_SET_HOURS,
    setMilliseconds: DATE_METHOD_SET_MILLISECONDS,
    setMinutes: DATE_METHOD_SET_MINUTES,
    setMonth: DATE_METHOD_SET_MONTH,
    setSeconds: DATE_METHOD_SET_SECONDS,
    setTime: DATE_METHOD_SET_TIME,
    setUTCDate: DATE_METHOD_SET_UTC_DATE,
    setUTCFullYear: DATE_METHOD_SET_UTC_FULL_YEAR,
    setUTCHours: DATE_METHOD_SET_UTC_HOURS,
    setUTCMilliseconds: DATE_METHOD_SET_UTC_MILLISECONDS,
    setUTCMinutes: DATE_METHOD_SET_UTC_MINUTES,
    setUTCMonth: DATE_METHOD_SET_UTC_MONTH,
    setUTCSeconds: DATE_METHOD_SET_UTC_SECONDS,
    setYear: DATE_METHOD_SET_YEAR,
    toDateString: DATE_METHOD_TO_DATE_STRING,
    toGMTString: DATE_METHOD_TO_GMT_STRING,
    toISOString: DATE_METHOD_TO_ISO_STRING,
    toJSON: DATE_METHOD_TO_JSON,
    toLocaleDateString: DATE_METHOD_TO_LOCALE_DATE_STRING,
    toLocaleString: DATE_METHOD_TO_LOCALE_STRING,
    toLocaleTimeString: DATE_METHOD_TO_LOCALE_TIME_STRING,
    toString: DATE_METHOD_TO_STRING,
    toTimeString: DATE_METHOD_TO_TIME_STRING,
    toUTCString: DATE_METHOD_TO_UTC_STRING,
    valueOf: DATE_METHOD_VALUE_OF
  }
);
