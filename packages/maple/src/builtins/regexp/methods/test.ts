import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import type { RegExpWrapper } from '../../../values/wrappers.ts';
import { matcherOf } from '../utils/matcher-of.ts';

export const REGEXP_METHOD_TEST: Method<RegExpWrapper> = method(
  RegExp.prototype.test.length,
  (r, [text]) => matcherOf(r).test(toString(text))
);
