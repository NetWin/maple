import { method, type Method } from '../../../values/native.ts';
import { matchToSandbox } from '../../regexp/utils/match-to-sandbox.ts';
import { toRegExp } from '../../regexp/utils/to-regexp.ts';

export const STRING_METHOD_MATCH: Method<string> = method(
  String.prototype.match.length,
  (s, [pattern], context) => matchToSandbox(s.match(toRegExp(pattern, '', context)))
);
