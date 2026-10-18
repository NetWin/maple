import { optionalStringArgument } from '../../../values/arguments.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_NORMALIZE: Method<string> = method(
  String.prototype.normalize.length,
  (s, [form], { fail }) => guardHostErrors(fail, () => s.normalize(optionalStringArgument(form)))
);
