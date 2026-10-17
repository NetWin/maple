import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_UTC_MINUTES: Method<DateWrapper> = method(
  Date.prototype.getUTCMinutes.length,
  (d) => d.date.getUTCMinutes()
);
