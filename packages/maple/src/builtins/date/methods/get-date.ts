import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_DATE: Method<DateWrapper> = method(
  Date.prototype.getDate.length,
  (d) => d.date.getDate()
);
