import { intlOptionsArgument, localesArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';
import { DateWrapper } from '../../../values/wrappers.ts';

export const ARRAY_METHOD_TO_LOCALE_STRING: Method<Array<unknown>> = method(
  Array.prototype.toLocaleString.length,
  (a, [locales, options], { fail }) => {
    const mapped = a.map((element) => {
      if (element === null || element === undefined) {
        return '';
      }

      if (typeof element === 'number') {
        return guardHostErrors(fail, () =>
          element.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
        );
      }

      if (element instanceof DateWrapper) {
        return guardHostErrors(fail, () =>
          element.date.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
        );
      }

      return toString(element);
    });
    return mapped.join(',');
  }
);
