import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';
import { matcherOf } from '../../regexp/utils/matcher-of.ts';

export const STRING_METHOD_SPLIT: Method<string> = method(
  String.prototype.split.length,
  (s, [separator, limit]) =>
    separator === undefined
      ? [s].slice(0, optionalNumberArgument(limit) ?? 1)
      : s.split(
          separator instanceof RegExpWrapper ? matcherOf(separator) : toString(separator),
          optionalNumberArgument(limit)
        )
);
