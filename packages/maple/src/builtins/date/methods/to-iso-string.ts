import { guardHostErrors, type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_TO_ISO_STRING: Method<DateWrapper> = method(
  Date.prototype.toISOString.length,
  (d, _args, { fail }) => guardHostErrors(fail, () => d.date.toISOString())
);
