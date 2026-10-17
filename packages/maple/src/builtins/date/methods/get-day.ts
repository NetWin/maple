import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_DAY: Method<DateWrapper> = method(Date.prototype.getDay.length, (d) =>
  d.date.getDay()
);
