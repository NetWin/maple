import { intlOptionsArgument, localesArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { guardIntlErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_LOCALE_COMPARE: Method<string> = method(
  String.prototype.localeCompare.length,
  (s, [that, locales, options], { fail }) => {
    const other = toString(that);
    const tags = localesArgument(locales);
    const intlOptions = intlOptionsArgument(options);
    return guardIntlErrors(fail, () => s.localeCompare(other, tags, intlOptions));
  }
);
