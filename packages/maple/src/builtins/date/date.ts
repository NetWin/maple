import { Builtin } from '../../values/builtin.ts';
import { toPrimitive } from '../../values/coercion.ts';
import { DateWrapper } from '../../values/wrappers/date-wrapper.ts';
import { DATE_PROTOTYPE } from './date-prototype.ts';
import { DATE_STATICS } from './date-statics.ts';
import { dateComponents } from './utils/date-components.ts';

export const DATE_BUILTIN: Builtin = new Builtin({
  name: 'Date',
  length: Date.length,
  call: () => new Date().toString(),
  // `new Date()`, `new Date(value)` and `new Date(year, month, ...)`, as the language distinguishes them
  construct: (args) => {
    if (args.length === 0) {
      return new DateWrapper(new Date());
    }

    if (args.length === 1) {
      const value = args[0];
      if (value instanceof DateWrapper) {
        return new DateWrapper(new Date(value.date.getTime()));
      }
      const primitive = toPrimitive(value);
      const arg = typeof primitive === 'string' ? new Date(primitive) : new Date(Number(primitive));
      return new DateWrapper(arg);
    }

    const [year, month, day, hours, minutes, seconds, milliseconds] = dateComponents(args);
    return new DateWrapper(new Date(year, month, day, hours, minutes, seconds, milliseconds));
  },
  members: DATE_STATICS,
  isInstance: (value) => value instanceof DateWrapper,
  prototype: DATE_PROTOTYPE
});
