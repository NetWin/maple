import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_TO_DATE_STRING: Method<DateWrapper> = method(
  Date.prototype.toDateString.length,
  (d) => d.date.toDateString()
);
