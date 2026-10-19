import { toString } from '../../../values/coercion.ts';
import { isCallable, method, type Method } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';
import { matcherOf } from '../../regexp/utils/matcher-of.ts';

/** A function replacement runs as a script callback; a string one uses the host's `$` patterns. */
export const STRING_METHOD_REPLACE_ALL: Method<string> = method(
  String.prototype.replaceAll.length,
  (s, [pattern, replacement], context) => {
    if (pattern instanceof RegExpWrapper && !pattern.regexp.global) {
      return context.fail('TypeError', 'replaceAll must be called with a global RegExp');
    }
    const search =
      pattern instanceof RegExpWrapper ? matcherOf(pattern, context) : toString(pattern);
    if (!isCallable(replacement)) {
      return s.replaceAll(search, toString(replacement));
    }
    return s.replaceAll(search, (...hostArgs: Array<unknown>): string =>
      toString(context.call(undefined, replacement, hostArgs))
    );
  }
);
