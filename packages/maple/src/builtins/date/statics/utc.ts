import { NativeFunction } from '../../../values/native.ts';
import { dateComponents } from '../utils/date-components.ts';

export const DATE_STATIC_UTC: NativeFunction = new NativeFunction(
  'UTC',
  Date.UTC.length,
  (args) => {
    const [year, month, day, hours, minutes, seconds, milliseconds] = dateComponents(args);
    return Date.UTC(year, month, day, hours, minutes, seconds, milliseconds);
  }
);
