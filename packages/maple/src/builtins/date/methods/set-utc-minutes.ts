import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_UTC_MINUTES: Method<DateWrapper> = method(
  Date.prototype.setUTCMinutes.length,
  setter('setUTCMinutes', (date) => date.setUTCMinutes.bind(date))
);
