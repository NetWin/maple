import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_HOURS: Method<DateWrapper> = method(
  Date.prototype.setHours.length,
  setter('setHours', (date) => date.setHours.bind(date))
);
