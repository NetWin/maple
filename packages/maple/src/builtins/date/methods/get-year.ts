import { type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_GET_YEAR: Method<DateWrapper> = method(
  0 /* Annex B, not in TypeScript's lib */,
  (d) => d.date.getFullYear() - 1900
);
