import { method, type Method } from '../../../values/native.ts';
import { toRegExp } from '../../regexp/utils/to-regexp.ts';

export const STRING_METHOD_SEARCH: Method<string> = method(
  String.prototype.search.length,
  (s, [pattern], context) => s.search(toRegExp(pattern, '', context))
);
