import { localesArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_TO_LOCALE_LOWER_CASE: Method<string> = method(
  String.prototype.toLocaleLowerCase.length,
  (s, [locales], { fail }) =>
    guardHostErrors(fail, () => s.toLocaleLowerCase(localesArgument(locales)))
);
