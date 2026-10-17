import { intlOptionsArgument, localesArgument } from '../../../values/arguments.ts';
import { guardIntlErrors, type Method, method } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const DATE_METHOD_TO_LOCALE_STRING: Method<DateWrapper> = method(
  Date.prototype.toLocaleString.length,
  (d, [locales, options], { fail }) => {
    const tags = localesArgument(locales);
    const intlOptions = intlOptionsArgument(options);
    return guardIntlErrors(fail, () => d.date.toLocaleString(tags, intlOptions));
  }
);
