import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_INCLUDES: Method<string> = method(
  String.prototype.includes.length,
  (s, [search, position]) => s.includes(toString(search), optionalNumberArgument(position))
);
