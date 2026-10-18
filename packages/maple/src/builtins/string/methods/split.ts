import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toNumber, toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';

// ToUint32, as JavaScript converts the limit: -1 means 2^32 - 1, Infinity means 0
const MAX_SPLIT_LIMIT = 2 ** 32 - 1;

/** The host splits on a copy of a regexp, so the wrapper's own is never written to. */
export const STRING_METHOD_SPLIT: Method<string> = method(
  String.prototype.split.length,
  (s, [separator, limit]) => {
    if (separator === undefined) {
      const lim = limit === undefined ? MAX_SPLIT_LIMIT : toNumber(limit) >>> 0;
      return lim === 0 ? [] : [s];
    }
    return s.split(
      separator instanceof RegExpWrapper ? separator.regexp : toString(separator),
      optionalNumberArgument(limit)
    );
  }
);
