import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_UTC_MILLISECONDS: Method<DateWrapper> = method(
  Date.prototype.setUTCMilliseconds.length,
  setter('setUTCMilliseconds', (date) => date.setUTCMilliseconds.bind(date))
);
