import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_UTC_SECONDS: Method<DateWrapper> = method(
  Date.prototype.getUTCSeconds.length,
  (d) => d.date.getUTCSeconds()
);
