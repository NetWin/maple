import { method, type Method } from '../../../values/native.ts';
import type { RegExpWrapper } from '../../../values/wrappers.ts';

export const REGEXP_METHOD_TO_STRING: Method<RegExpWrapper> = method(
  RegExp.prototype.toString.length,
  (r) => String(r.regexp)
);
