import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers.ts';
import { setter } from '../utils/setter.ts';

export const DATE_METHOD_SET_MILLISECONDS: Method<DateWrapper> = method(
  Date.prototype.setMilliseconds.length,
  setter('setMilliseconds', (date) => date.setMilliseconds.bind(date))
);
