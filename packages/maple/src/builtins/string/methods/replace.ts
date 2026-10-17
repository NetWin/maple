import { toString } from '../../../values/coercion.ts';
import { isCallable, method, type Method } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';
import { groupsToSandbox } from '../../regexp/utils/groups-to-sandbox.ts';
import { matcherOf } from '../../regexp/utils/matcher-of.ts';

/** A function replacement runs as a script callback; a string one uses the host's `$` patterns. */
export const STRING_METHOD_REPLACE: Method<string> = method(
  String.prototype.replace.length,
  (s, [pattern, replacement], context) => {
    const search =
      pattern instanceof RegExpWrapper ? matcherOf(pattern, context) : toString(pattern);
    if (!isCallable(replacement)) {
      return s.replace(search, toString(replacement));
    }
    // The host passes `(match, ...captures, offset, string, groups?)`; the groups object needs
    // converting
    return s.replace(search, (...hostArgs: Array<unknown>): string => {
      const last = hostArgs.at(-1);
      const args =
        typeof last === 'object' && last !== null
          ? [...hostArgs.slice(0, -1), groupsToSandbox(last)]
          : hostArgs;
      return toString(context.call(replacement, args));
    });
  }
);
