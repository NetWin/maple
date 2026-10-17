import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_UTC_DAY: Method<DateWrapper> = method(
  Date.prototype.getUTCDay.length,
  (d) => d.date.getUTCDay()
);
