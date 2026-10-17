import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_INDEX_OF: Method<string> = method(
  String.prototype.indexOf.length,
  (s, [search, position]) => s.indexOf(toString(search), optionalNumberArgument(position))
);
