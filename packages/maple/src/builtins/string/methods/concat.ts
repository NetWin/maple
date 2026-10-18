import { toString } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const STRING_METHOD_CONCAT: Method<string> = method(
  String.prototype.concat.length,
  (s, args, { fail }) => guardHostErrors(fail, () => s.concat(...args.map(toString)))
);
