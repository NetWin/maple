import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_TIMEZONE_OFFSET: Method<DateWrapper> = method(
  Date.prototype.getTimezoneOffset.length,
  (d) => d.date.getTimezoneOffset()
);
