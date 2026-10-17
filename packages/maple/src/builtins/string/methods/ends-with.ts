import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_ENDS_WITH: Method<string> = method(
  String.prototype.endsWith.length,
  (s, [search, end]) => s.endsWith(toString(search), optionalNumberArgument(end))
);
