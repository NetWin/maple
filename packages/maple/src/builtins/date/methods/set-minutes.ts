import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_MINUTES: Method<DateWrapper> = method(
  Date.prototype.setMinutes.length,
  setter('setMinutes', (date) => date.setMinutes.bind(date))
);
