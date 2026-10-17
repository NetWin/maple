import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_HOURS: Method<DateWrapper> = method(
  Date.prototype.getHours.length,
  (d) => d.date.getHours()
);
