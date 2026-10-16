import {
  intlOptionsArgument,
  localesArgument,
  optionalNumber,
  optionalString
} from '../values/arguments.ts';
import { toNumber, toString } from '../values/coercion.ts';
import { type CallContext, guardHostErrors, isCallable, type Method } from '../values/native.ts';
import { IteratorWrapper, RegExpWrapper } from '../values/wrappers.ts';
import { groupsToSandbox, matcherOf, matchToSandbox, toRegExp } from './regexp-methods.ts';

type StringMethod = Method<string>;

/**
 * Every entry hands the host method primitives only, converted hook-free first, so a script
 * object can never run code inside a built-in.
 */
export const STRING_METHODS: ReadonlyMap<string, StringMethod> = new Map<string, StringMethod>([
  ['at', (s, [index]) => s.at(toNumber(index))],
  ['charAt', (s, [index]) => s.charAt(toNumber(index))],
  ['charCodeAt', (s, [index]) => s.charCodeAt(toNumber(index))],
  ['codePointAt', (s, [index]) => s.codePointAt(toNumber(index))],
  ['concat', (s, args, { fail }) => guardHostErrors(fail, () => s.concat(...args.map(toString)))],
  ['endsWith', (s, [search, end]) => s.endsWith(toString(search), optionalNumber(end))],
  ['isWellFormed', (s) => s.isWellFormed()],
  ['includes', (s, [search, position]) => s.includes(toString(search), optionalNumber(position))],
  ['indexOf', (s, [search, position]) => s.indexOf(toString(search), optionalNumber(position))],
  [
    'lastIndexOf',
    (s, [search, position]) => s.lastIndexOf(toString(search), optionalNumber(position))
  ],
  [
    'normalize',
    (s, [form], { fail }) => guardHostErrors(fail, () => s.normalize(optionalString(form)))
  ],
  [
    'padEnd',
    (s, [length, fill], { fail }) =>
      guardHostErrors(fail, () => s.padEnd(toNumber(length), optionalString(fill)))
  ],
  [
    'padStart',
    (s, [length, fill], { fail }) =>
      guardHostErrors(fail, () => s.padStart(toNumber(length), optionalString(fill)))
  ],
  ['repeat', (s, [count], { fail }) => guardHostErrors(fail, () => s.repeat(toNumber(count)))],
  [
    'replace',
    (s, [pattern, replacement], context) => replace(s, pattern, replacement, context, false)
  ],
  [
    'replaceAll',
    (s, [pattern, replacement], context) => replace(s, pattern, replacement, context, true)
  ],
  ['slice', (s, [start, end]) => s.slice(optionalNumber(start), optionalNumber(end))],
  [
    'split',
    (s, [separator, limit]) =>
      separator === undefined
        ? [s].slice(0, optionalNumber(limit) ?? 1)
        : s.split(
            separator instanceof RegExpWrapper ? matcherOf(separator) : toString(separator),
            optionalNumber(limit)
          )
  ],
  ['match', (s, [pattern], context) => matchToSandbox(s.match(toRegExp(pattern, '', context)))],
  [
    'matchAll',
    (s, [pattern], context) => {
      const regexp = toRegExp(pattern, 'g', context);
      if (!regexp.global) {
        return context.fail(
          'TypeError',
          'String.prototype.matchAll called with a non-global RegExp argument'
        );
      }
      return new IteratorWrapper(matchesToSandbox(s.matchAll(regexp)));
    }
  ],
  ['search', (s, [pattern], context) => s.search(toRegExp(pattern, '', context))],
  [
    'startsWith',
    (s, [search, position]) => s.startsWith(toString(search), optionalNumber(position))
  ],
  ['substr', (s, [start, length]) => substr(s, start, length)],
  ['substring', (s, [start, end]) => s.substring(toNumber(start), optionalNumber(end))],
  [
    'localeCompare',
    (s, [that, locales, options], { fail }) =>
      guardHostErrors(fail, () =>
        s.localeCompare(toString(that), localesArgument(locales), intlOptionsArgument(options))
      )
  ],
  [
    'toLocaleLowerCase',
    (s, [locales], { fail }) =>
      guardHostErrors(fail, () => s.toLocaleLowerCase(localesArgument(locales)))
  ],
  [
    'toLocaleUpperCase',
    (s, [locales], { fail }) =>
      guardHostErrors(fail, () => s.toLocaleUpperCase(localesArgument(locales)))
  ],
  ['toLowerCase', (s) => s.toLowerCase()],
  ['toString', (s) => s],
  ['toUpperCase', (s) => s.toUpperCase()],
  ['toWellFormed', (s) => s.toWellFormed()],
  ['trim', (s) => s.trim()],
  ['trimEnd', (s) => s.trimEnd()],
  ['trimLeft', (s) => s.trimStart()],
  ['trimRight', (s) => s.trimEnd()],
  ['trimStart', (s) => s.trimStart()]
]);

/**
 * `substr` is a legacy method that the host's typings mark as deprecated, so it follows the
 * language's algorithm here: a negative start counts from the end, the length is clamped.
 */
function substr(s: string, start: unknown, length: unknown): string {
  const from = toIntegerOrInfinity(start);
  const begin = from < 0 ? Math.max(s.length + from, 0) : Math.min(from, s.length);
  const count = length === undefined ? s.length : toIntegerOrInfinity(length);
  const end = Math.min(begin + Math.min(Math.max(count, 0), s.length), s.length);
  return s.slice(begin, end);
}

function toIntegerOrInfinity(value: unknown): number {
  const number = toNumber(value);
  return Number.isNaN(number) ? 0 : Math.trunc(number);
}

/** A function replacement runs as a script callback; a string one uses the host's `$` patterns. */
function replace(
  s: string,
  pattern: unknown,
  replacement: unknown,
  context: CallContext,
  all: boolean
): string {
  const search = pattern instanceof RegExpWrapper ? matcherOf(pattern) : toString(pattern);
  if (all && search instanceof RegExp && !search.global) {
    return context.fail('TypeError', 'replaceAll must be called with a global RegExp');
  }
  if (!isCallable(replacement)) {
    const text = toString(replacement);
    return all ? s.replaceAll(search, text) : s.replace(search, text);
  }
  const replacer = (...hostArgs: Array<unknown>): string =>
    toString(context.call(replacement, replacerArguments(hostArgs)));
  return all ? s.replaceAll(search, replacer) : s.replace(search, replacer);
}

/**
 * The host passes `(match, ...captures, offset, string, groups?)`; the groups object needs
 * converting.
 */
function replacerArguments(hostArgs: ReadonlyArray<unknown>): Array<unknown> {
  const last = hostArgs.at(-1);
  if (typeof last === 'object' && last !== null) {
    return [...hostArgs.slice(0, -1), groupsToSandbox(last)];
  }
  return [...hostArgs];
}

function* matchesToSandbox(matches: Iterable<RegExpMatchArray>): Iterator<unknown> {
  for (const match of matches) {
    yield matchToSandbox(match);
  }
}
