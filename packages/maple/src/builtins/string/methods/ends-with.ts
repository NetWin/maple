import { optionalNumberArgument, searchStringArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_ENDS_WITH: Method<string> = method(
  String.prototype.endsWith.length,
  (s, [search, end], { fail }) =>
    s.endsWith(searchStringArgument(search, 'endsWith', fail), optionalNumberArgument(end))
);
