import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_TO_STRING: Method<DateWrapper> = method(
  Date.prototype.toString.length,
  (d) => d.date.toString()
);
