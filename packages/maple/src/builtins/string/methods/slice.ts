import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_SLICE: Method<string> = method(
  String.prototype.slice.length,
  (s, [start, end]) => s.slice(optionalNumberArgument(start), optionalNumberArgument(end))
);
