import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_FULL_YEAR: Method<DateWrapper> = method(
  Date.prototype.setFullYear.length,
  setter('setFullYear', (date) => date.setFullYear.bind(date))
);
