import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import type { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';
import { matchToSandbox } from '../utils/match-to-sandbox.ts';
import { matcherOf } from '../utils/matcher-of.ts';

export const REGEXP_METHOD_EXEC: Method<RegExpWrapper> = method(
  RegExp.prototype.exec.length,
  (r, [text], { fail }) => matchToSandbox(matcherOf(r, fail).exec(toString(text)))
);
