import { optionalNumberArgument, searchStringArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_STARTS_WITH: Method<string> = method(
  String.prototype.startsWith.length,
  (s, [search, position], { fail }) =>
    s.startsWith(searchStringArgument(search, 'startsWith', fail), optionalNumberArgument(position))
);
