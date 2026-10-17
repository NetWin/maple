import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';
import { replaceContents } from '../utils/replace-contents.ts';

export const ARRAY_METHOD_REVERSE: Method<Array<unknown>> = method(
  Array.prototype.reverse.length,
  (a, _args, context) =>
    replaceContents(asMutableArrayOrThrow(a, context, 'reverse'), a.toReversed())
);
