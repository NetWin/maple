import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_DATE: Method<DateWrapper> = method(
  Date.prototype.setDate.length,
  setter('setDate', (date) => date.setDate.bind(date))
);
