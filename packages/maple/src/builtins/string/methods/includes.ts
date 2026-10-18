import { optionalNumberArgument, searchStringArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_INCLUDES: Method<string> = method(
  String.prototype.includes.length,
  (s, [search, position], { fail }) =>
    s.includes(searchStringArgument(search, 'includes', fail), optionalNumberArgument(position))
);
