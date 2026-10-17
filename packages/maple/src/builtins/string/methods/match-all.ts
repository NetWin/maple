import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers.ts';
import { matchToSandbox } from '../../regexp/utils/match-to-sandbox.ts';
import { toRegExp } from '../../regexp/utils/to-regexp.ts';

export const STRING_METHOD_MATCH_ALL: Method<string> = method(
  String.prototype.matchAll.length,
  (s, [pattern], context) => {
    const regexp = toRegExp(pattern, 'g', context);
    if (!regexp.global) {
      return context.fail(
        'TypeError',
        'String.prototype.matchAll called with a non-global RegExp argument'
      );
    }
    return new IteratorWrapper(s.matchAll(regexp).map((match) => matchToSandbox(match)));
  }
);
