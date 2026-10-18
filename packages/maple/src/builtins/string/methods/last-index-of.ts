import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_LAST_INDEX_OF: Method<string> = method(
  String.prototype.lastIndexOf.length,
  (s, [search, position]) => s.lastIndexOf(toString(search), optionalNumberArgument(position))
);
