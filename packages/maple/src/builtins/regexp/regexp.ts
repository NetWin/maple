import { Builtin } from '../../values/builtin.ts';
import { toString } from '../../values/coercion.ts';
import { type CallContext, guardHostErrors } from '../../values/native.ts';
import { RegExpWrapper } from '../../values/wrappers.ts';
import { REGEXP_PROTOTYPE } from './regexp-prototype.ts';

export const REGEXP_BUILTIN: Builtin = new Builtin({
  name: 'RegExp',
  length: RegExp.length,
  call: constructRegExp,
  construct: constructRegExp,
  isInstance: (value) => value instanceof RegExpWrapper,
  prototype: REGEXP_PROTOTYPE
});

/** `new RegExp(pattern, flags?)`; a pattern that is a regexp copies its source. */
function constructRegExp(args: ReadonlyArray<unknown>, context: CallContext): RegExpWrapper {
  const [pattern, flags] = args;
  const source =
    pattern instanceof RegExpWrapper
      ? pattern.regexp.source
      : pattern === undefined
        ? '(?:)'
        : toString(pattern);
  const flagText =
    flags === undefined
      ? pattern instanceof RegExpWrapper
        ? pattern.regexp.flags
        : undefined
      : toString(flags);
  return new RegExpWrapper(guardHostErrors(context.fail, () => new RegExp(source, flagText)));
}
