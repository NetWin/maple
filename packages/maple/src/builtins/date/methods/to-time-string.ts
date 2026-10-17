import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_TO_TIME_STRING: Method<DateWrapper> = method(
  Date.prototype.toTimeString.length,
  (d) => d.date.toTimeString()
);
