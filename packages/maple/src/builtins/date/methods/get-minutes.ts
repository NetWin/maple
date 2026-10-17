import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_MINUTES: Method<DateWrapper> = method(
  Date.prototype.getMinutes.length,
  (d) => d.date.getMinutes()
);
