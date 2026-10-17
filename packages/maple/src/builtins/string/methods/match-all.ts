import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';
import { matchToSandbox } from '../../regexp/utils/match-to-sandbox.ts';
import { toRegExp } from '../../regexp/utils/to-regexp.ts';

/** The host matches on a copy of a regexp, so the wrapper's own is never written to. */
export const STRING_METHOD_MATCH_ALL: Method<string> = method(
  String.prototype.matchAll.length,
  (s, [pattern], context) => {
    const regexp =
      pattern instanceof RegExpWrapper ? pattern.regexp : toRegExp(pattern, 'g', context);

    if (!regexp.global) {
      return context.fail(
        'TypeError',
        'String.prototype.matchAll called with a non-global RegExp argument'
      );
    }

    return new IteratorWrapper(s.matchAll(regexp).map((match) => matchToSandbox(match)));
  }
);
