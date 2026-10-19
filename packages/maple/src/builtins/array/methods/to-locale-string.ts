import { intlOptionsArgument, localesArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { guardIntlErrors, method, type Method } from '../../../values/native.ts';
import { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';

export const ARRAY_METHOD_TO_LOCALE_STRING: Method<Array<unknown>> = method(
  Array.prototype.toLocaleString.length,
  (a, [locales, options], { fail }) => {
    const tags = localesArgument(locales);
    const intlOptions = intlOptionsArgument(options);
    const mapped = Array.prototype.map.call(a, (element) => {
      if (element === null || element === undefined) {
        return '';
      }

      if (typeof element === 'number') {
        return guardIntlErrors(fail, () => element.toLocaleString(tags, intlOptions));
      }

      if (element instanceof DateWrapper) {
        return guardIntlErrors(fail, () => element.date.toLocaleString(tags, intlOptions));
      }

      return toString(element);
    });
    return mapped.join(',');
  }
);
