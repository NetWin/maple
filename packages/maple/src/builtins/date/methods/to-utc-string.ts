import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_TO_UTC_STRING: Method<DateWrapper> = method(
  Date.prototype.toUTCString.length,
  (d) => d.date.toUTCString()
);
