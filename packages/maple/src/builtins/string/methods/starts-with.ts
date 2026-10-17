import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_STARTS_WITH: Method<string> = method(
  String.prototype.startsWith.length,
  (s, [search, position]) => s.startsWith(toString(search), optionalNumberArgument(position))
);
