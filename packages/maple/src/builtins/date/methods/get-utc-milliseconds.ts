import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_UTC_MILLISECONDS: Method<DateWrapper> = method(
  Date.prototype.getUTCMilliseconds.length,
  (d) => d.date.getUTCMilliseconds()
);
