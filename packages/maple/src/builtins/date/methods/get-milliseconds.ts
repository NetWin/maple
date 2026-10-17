import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_GET_MILLISECONDS: Method<DateWrapper> = method(
  Date.prototype.getMilliseconds.length,
  (d) => d.date.getMilliseconds()
);
