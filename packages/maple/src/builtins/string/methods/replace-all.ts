import { toString } from '../../../values/coercion.ts';
import { isCallable, method, type Method } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers.ts';
import { groupsToSandbox } from '../../regexp/utils/groups-to-sandbox.ts';
import { matcherOf } from '../../regexp/utils/matcher-of.ts';

/** A function replacement runs as a script callback; a string one uses the host's `$` patterns. */
export const STRING_METHOD_REPLACE_ALL: Method<string> = method(
  String.prototype.replaceAll.length,
  (s, [pattern, replacement], context) => {
    const search = pattern instanceof RegExpWrapper ? matcherOf(pattern) : toString(pattern);
    if (search instanceof RegExp && !search.global) {
      return context.fail('TypeError', 'replaceAll must be called with a global RegExp');
    }
    if (!isCallable(replacement)) {
      return s.replaceAll(search, toString(replacement));
    }
    // The host passes `(match, ...captures, offset, string, groups?)`; the groups object needs
    // converting
    return s.replaceAll(search, (...hostArgs: Array<unknown>): string => {
      const last = hostArgs.at(-1);
      const args =
        typeof last === 'object' && last !== null
          ? [...hostArgs.slice(0, -1), groupsToSandbox(last)]
          : hostArgs;
      return toString(context.call(replacement, args));
    });
  }
);
