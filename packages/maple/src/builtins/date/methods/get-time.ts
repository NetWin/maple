import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_TIME: Method<DateWrapper> = method(
  Date.prototype.getTime.length,
  (d) => d.date.getTime()
);
