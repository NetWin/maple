import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_UTC_FULL_YEAR: Method<DateWrapper> = method(
  Date.prototype.setUTCFullYear.length,
  setter('setUTCFullYear', (date) => date.setUTCFullYear.bind(date))
);
