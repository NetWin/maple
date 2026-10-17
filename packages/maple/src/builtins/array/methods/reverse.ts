import { method, type Method } from '../../../values/native.ts';
import { guardIntegrityErrors } from '../utils/guard-integrity-errors.ts';
import { replaceContents } from '../utils/replace-contents.ts';

export const ARRAY_METHOD_REVERSE: Method<Array<unknown>> = method(
  Array.prototype.reverse.length,
  (a, _args, context) => {
    const reversed = a.toReversed();
    return guardIntegrityErrors(context.fail, a, () => replaceContents(a, reversed));
  }
);
