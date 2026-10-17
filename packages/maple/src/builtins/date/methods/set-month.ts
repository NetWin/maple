import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_MONTH: Method<DateWrapper> = method(
  Date.prototype.setMonth.length,
  setter('setMonth', (date) => date.setMonth.bind(date))
);
