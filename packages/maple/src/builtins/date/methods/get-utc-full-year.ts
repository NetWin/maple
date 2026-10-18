import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_UTC_FULL_YEAR: Method<DateWrapper> = method(
  Date.prototype.getUTCFullYear.length,
  (d) => d.date.getUTCFullYear()
);
