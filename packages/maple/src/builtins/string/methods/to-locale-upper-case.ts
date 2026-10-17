import { localesArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_LOCALE_UPPER_CASE: Method<string> = method(
  String.prototype.toLocaleUpperCase.length,
  (s, [locales], { fail }) =>
    guardHostErrors(fail, () => s.toLocaleUpperCase(localesArgument(locales)))
);
