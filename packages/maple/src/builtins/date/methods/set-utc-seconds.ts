import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_UTC_SECONDS: Method<DateWrapper> = method(
  Date.prototype.setUTCSeconds.length,
  setter('setUTCSeconds', (date) => date.setUTCSeconds.bind(date))
);
