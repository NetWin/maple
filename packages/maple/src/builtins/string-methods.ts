import {
  intlOptionsArgument,
  localesArgument,
  optionalNumberArgument,
  optionalStringArgument
} from '../values/arguments.ts';
import { toNumber, toString } from '../values/coercion.ts';
import {
  type CallContext,
  guardHostErrors,
  guardIntlErrors,
  isCallable,
  type Method,
  method
} from '../values/native.ts';
import { IteratorWrapper, RegExpWrapper } from '../values/wrappers.ts';
import { groupsToSandbox } from './regexp/utils/groups-to-sandbox.ts';
import { matchToSandbox } from './regexp/utils/match-to-sandbox.ts';
import { matcherOf } from './regexp/utils/matcher-of.ts';
import { toRegExp } from './regexp/utils/to-regexp.ts';

type StringMethod = Method<string>;

/**
 * Every entry hands the host method primitives only, converted hook-free first, so a script
 * object can never run code inside a built-in.
 */
export const STRING_METHODS: ReadonlyMap<string, StringMethod> = new Map<string, StringMethod>([
  ['at', method(String.prototype.at.length, (s, [index]) => s.at(toNumber(index)))],
  ['charAt', method(String.prototype.charAt.length, (s, [index]) => s.charAt(toNumber(index)))],
  [
    'charCodeAt',
    method(String.prototype.charCodeAt.length, (s, [index]) => s.charCodeAt(toNumber(index)))
  ],
  [
    'codePointAt',
    method(String.prototype.codePointAt.length, (s, [index]) => s.codePointAt(toNumber(index)))
  ],
  [
    'concat',
    method(String.prototype.concat.length, (s, args, { fail }) =>
      guardHostErrors(fail, () => s.concat(...args.map(toString)))
    )
  ],
  [
    'endsWith',
    method(String.prototype.endsWith.length, (s, [search, end]) =>
      s.endsWith(toString(search), optionalNumberArgument(end))
    )
  ],
  ['isWellFormed', method(String.prototype.isWellFormed.length, (s) => s.isWellFormed())],
  [
    'includes',
    method(String.prototype.includes.length, (s, [search, position]) =>
      s.includes(toString(search), optionalNumberArgument(position))
    )
  ],
  [
    'indexOf',
    method(String.prototype.indexOf.length, (s, [search, position]) =>
      s.indexOf(toString(search), optionalNumberArgument(position))
    )
  ],
  [
    'lastIndexOf',
    method(String.prototype.lastIndexOf.length, (s, [search, position]) =>
      s.lastIndexOf(toString(search), optionalNumberArgument(position))
    )
  ],
  [
    'normalize',
    method(String.prototype.normalize.length, (s, [form], { fail }) =>
      guardHostErrors(fail, () => s.normalize(optionalStringArgument(form)))
    )
  ],
  [
    'padEnd',
    method(String.prototype.padEnd.length, (s, [length, fill], { fail }) =>
      guardHostErrors(fail, () => s.padEnd(toNumber(length), optionalStringArgument(fill)))
    )
  ],
  [
    'padStart',
    method(String.prototype.padStart.length, (s, [length, fill], { fail }) =>
      guardHostErrors(fail, () => s.padStart(toNumber(length), optionalStringArgument(fill)))
    )
  ],
  [
    'repeat',
    method(String.prototype.repeat.length, (s, [count], { fail }) =>
      guardHostErrors(fail, () => s.repeat(toNumber(count)))
    )
  ],
  [
    'replace',
    method(String.prototype.replace.length, (s, [pattern, replacement], context) =>
      replace(s, pattern, replacement, context, false)
    )
  ],
  [
    'replaceAll',
    method(String.prototype.replaceAll.length, (s, [pattern, replacement], context) =>
      replace(s, pattern, replacement, context, true)
    )
  ],
  [
    'slice',
    method(String.prototype.slice.length, (s, [start, end]) =>
      s.slice(optionalNumberArgument(start), optionalNumberArgument(end))
    )
  ],
  [
    'split',
    method(String.prototype.split.length, (s, [separator, limit]) =>
      separator === undefined
        ? [s].slice(0, optionalNumberArgument(limit) ?? 1)
        : s.split(
            separator instanceof RegExpWrapper ? matcherOf(separator) : toString(separator),
            optionalNumberArgument(limit)
          )
    )
  ],
  [
    'match',
    method(String.prototype.match.length, (s, [pattern], context) =>
      matchToSandbox(s.match(toRegExp(pattern, '', context)))
    )
  ],
  [
    'matchAll',
    method(String.prototype.matchAll.length, (s, [pattern], context) => {
      const regexp = toRegExp(pattern, 'g', context);
      if (!regexp.global) {
        return context.fail(
          'TypeError',
          'String.prototype.matchAll called with a non-global RegExp argument'
        );
      }
      return new IteratorWrapper(matchesToSandbox(s.matchAll(regexp)));
    })
  ],
  [
    'search',
    method(String.prototype.search.length, (s, [pattern], context) =>
      s.search(toRegExp(pattern, '', context))
    )
  ],
  [
    'startsWith',
    method(String.prototype.startsWith.length, (s, [search, position]) =>
      s.startsWith(toString(search), optionalNumberArgument(position))
    )
  ],
  [
    'substr',
    method(2 /* deprecated in TypeScript's lib */, (s, [start, length]) => substr(s, start, length))
  ],
  [
    'substring',
    method(String.prototype.substring.length, (s, [start, end]) =>
      s.substring(toNumber(start), optionalNumberArgument(end))
    )
  ],
  [
    'localeCompare',
    method(String.prototype.localeCompare.length, (s, [that, locales, options], { fail }) => {
      const other = toString(that);
      const tags = localesArgument(locales);
      const intlOptions = intlOptionsArgument(options);
      return guardIntlErrors(fail, () => s.localeCompare(other, tags, intlOptions));
    })
  ],
  [
    'toLocaleLowerCase',
    method(String.prototype.toLocaleLowerCase.length, (s, [locales], { fail }) =>
      guardHostErrors(fail, () => s.toLocaleLowerCase(localesArgument(locales)))
    )
  ],
  [
    'toLocaleUpperCase',
    method(String.prototype.toLocaleUpperCase.length, (s, [locales], { fail }) =>
      guardHostErrors(fail, () => s.toLocaleUpperCase(localesArgument(locales)))
    )
  ],
  ['toLowerCase', method(String.prototype.toLowerCase.length, (s) => s.toLowerCase())],
  ['toString', method(String.prototype.toString.length, (s) => s)],
  ['toUpperCase', method(String.prototype.toUpperCase.length, (s) => s.toUpperCase())],
  ['toWellFormed', method(String.prototype.toWellFormed.length, (s) => s.toWellFormed())],
  ['trim', method(String.prototype.trim.length, (s) => s.trim())],
  ['trimEnd', method(String.prototype.trimEnd.length, (s) => s.trimEnd())],
  // Aliases of trimStart and trimEnd, which the host's typings mark as deprecated
  // oxlint-disable-next-line typescript/no-deprecated
  ['trimLeft', method(String.prototype.trimLeft.length, (s) => s.trimStart())],
  // oxlint-disable-next-line typescript/no-deprecated
  ['trimRight', method(String.prototype.trimRight.length, (s) => s.trimEnd())],
  ['trimStart', method(String.prototype.trimStart.length, (s) => s.trimStart())]
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
