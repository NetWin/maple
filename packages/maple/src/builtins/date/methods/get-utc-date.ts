import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_UTC_DATE: Method<DateWrapper> = method(
  Date.prototype.getUTCDate.length,
  (d) => d.date.getUTCDate()
);
