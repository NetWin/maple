import { Prototype } from '../../values/prototype.ts';
import { RegExpWrapper } from '../../values/wrappers/regexp-wrapper.ts';
import { REGEXP_METHOD_EXEC } from './methods/exec.ts';
import { REGEXP_METHOD_TEST } from './methods/test.ts';
import { REGEXP_METHOD_TO_STRING } from './methods/to-string.ts';

/** Matching runs natively; `lastIndex` on the wrapped regexp gives `g` and `y` their real semantics. */
export const REGEXP_PROTOTYPE: Prototype<RegExpWrapper> = new Prototype(
  'RegExp',
  (value): value is RegExpWrapper => value instanceof RegExpWrapper,
  {
    exec: REGEXP_METHOD_EXEC,
    test: REGEXP_METHOD_TEST,
    toString: REGEXP_METHOD_TO_STRING
  }
);
