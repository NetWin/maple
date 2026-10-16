import { defineOwn } from '../support/own-property.ts';
import { toString } from '../values/coercion.ts';
import { type CallContext, guardHostErrors, type Method } from '../values/native.ts';
import { RegExpWrapper } from '../values/wrappers.ts';

type RegExpMethod = Method<RegExpWrapper>;

/** Matching runs natively; `lastIndex` on the wrapped regexp gives `g` and `y` their real semantics. */
export const REGEXP_METHODS: ReadonlyMap<string, RegExpMethod> = new Map<string, RegExpMethod>([
  ['exec', (r, [text]) => matchToSandbox(matcherOf(r).exec(toString(text)))],
  ['test', (r, [text]) => matcherOf(r).test(toString(text))],
  ['toString', (r) => String(r.regexp)]
]);

/**
 * The regexp to match with. A read-only wrapper (from input or globals) matches on a fresh copy
 * every time, so `g` and `y` cannot carry `lastIndex` from one run of a script to the next.
 */
export function matcherOf(wrapper: RegExpWrapper): RegExp {
  return wrapper.frozen ? new RegExp(wrapper.regexp.source, wrapper.regexp.flags) : wrapper.regexp;
}

/** A regexp for the string methods that accept one: a wrapper's own, or one built from the text. */
export function toRegExp(pattern: unknown, flags: string, context: CallContext): RegExp {
  if (pattern instanceof RegExpWrapper) {
    return matcherOf(pattern);
  }
  const source = pattern === undefined ? '(?:)' : toString(pattern);
  return guardHostErrors(context.fail, () => new RegExp(source, flags));
}

/**
 * A host match result as a sandbox array: the captures as elements, `index`, `input` and a plain
 * `groups` object as own properties. A match from a global `match` has no such properties.
 */
export function matchToSandbox(match: RegExpMatchArray | null): Array<unknown> | null {
  if (match === null) {
    return null;
  }
  const result: Array<unknown> = [...match];
  if (match.index !== undefined) {
    defineOwn(result, 'index', match.index);
    defineOwn(result, 'input', match.input);
    defineOwn(result, 'groups', groupsToSandbox(match.groups));
  }
  return result;
}

/** Named groups arrive as a null-prototype host object and leave as an ordinary sandbox object. */
export function groupsToSandbox(groups: object | undefined): unknown {
  if (groups === undefined) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(groups)) {
    defineOwn(result, name, value);
  }
  return result;
}
