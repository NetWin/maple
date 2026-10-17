import { toString } from '../../../values/coercion.ts';
import { type CallContext, guardHostErrors } from '../../../values/native.ts';
import { RegExpWrapper } from '../../../values/wrappers.ts';
import { matcherOf } from './matcher-of.ts';

/** A regexp for the string methods that accept one: a wrapper's own, or one built from the text. */
export function toRegExp(pattern: unknown, flags: string, context: CallContext): RegExp {
  if (pattern instanceof RegExpWrapper) {
    return matcherOf(pattern);
  }
  const source = pattern === undefined ? '(?:)' : toString(pattern);
  return guardHostErrors(context.fail, () => new RegExp(source, flags));
}
