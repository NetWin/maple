import type { Method } from '../../values/native.ts';
import type { RegExpWrapper } from '../../values/wrappers.ts';
import { REGEXP_METHOD_EXEC } from './methods/exec.ts';
import { REGEXP_METHOD_TEST } from './methods/test.ts';
import { REGEXP_METHOD_TO_STRING } from './methods/to-string.ts';

/** Matching runs natively; `lastIndex` on the wrapped regexp gives `g` and `y` their real semantics. */
export const REGEXP_METHODS: ReadonlyMap<string, Method<RegExpWrapper>> = new Map([
  ['exec', REGEXP_METHOD_EXEC],
  ['test', REGEXP_METHOD_TEST],
  ['toString', REGEXP_METHOD_TO_STRING]
]);
