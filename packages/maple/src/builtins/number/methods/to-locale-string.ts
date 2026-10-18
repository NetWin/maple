import { intlOptionsArgument, localesArgument } from '../../../values/arguments.ts';
import { guardIntlErrors, method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_TO_LOCALE_STRING: Method<number> = method(
  Number.prototype.toLocaleString.length,
  (n, [locales, options], { fail }) => {
    const tags = localesArgument(locales);
    const intlOptions = intlOptionsArgument(options);
    return guardIntlErrors(fail, () => n.toLocaleString(tags, intlOptions));
  }
);
