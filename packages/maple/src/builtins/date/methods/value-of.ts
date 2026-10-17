import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';

export const DATE_METHOD_VALUE_OF: Method<DateWrapper> = method(
  Date.prototype.valueOf.length,
  (d) => d.date.getTime()
);
