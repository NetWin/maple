import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_MONTH: Method<DateWrapper> = method(
  Date.prototype.getMonth.length,
  (d) => d.date.getMonth()
);
