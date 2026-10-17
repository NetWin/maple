import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_SECONDS: Method<DateWrapper> = method(
  Date.prototype.setSeconds.length,
  setter('setSeconds', (date) => date.setSeconds.bind(date))
);
