import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_UTC_MONTH: Method<DateWrapper> = method(
  Date.prototype.getUTCMonth.length,
  (d) => d.date.getUTCMonth()
);
