import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_TO_JSON: Method<DateWrapper> = method(Date.prototype.toJSON.length, (d) =>
  Number.isNaN(d.date.getTime()) ? null : d.date.toISOString()
);
