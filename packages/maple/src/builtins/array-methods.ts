import { MAX_NESTING } from '../support/nesting-limit.ts';
import { intlOptionsArgument, localesArgument, optionalNumber } from '../values/arguments.ts';
import { joinValues, toNumber, toString } from '../values/coercion.ts';
import {
  type CallContext,
  guardHostErrors,
  isCallable,
  type Method,
  method
} from '../values/native.ts';
import { DateWrapper, IteratorWrapper } from '../values/wrappers.ts';

type ArrayMethod = Method<Array<unknown>>;
type Callback = (...args: Array<unknown>) => unknown;

/**
 * Callbacks always run through the interpreter, so they stay under the budget and the host never
 * holds a script function. Methods that mutate refuse read-only input arrays.
 */
export const ARRAY_METHODS: ReadonlyMap<string, ArrayMethod> = new Map<string, ArrayMethod>([
  ['at', method(Array.prototype.at.length, (a, [index]) => a.at(toNumber(index)))],
  [
    'concat',
    method(Array.prototype.concat.length, (a, items, { fail }) =>
      guardHostErrors(fail, () => a.concat(...items))
    )
  ],
  [
    'copyWithin',
    method(Array.prototype.copyWithin.length, (a, [target, start, end], context) =>
      asMutableOrThrow(a, context, 'copyWithin').copyWithin(
        toNumber(target),
        toNumber(start),
        optionalNumber(end)
      )
    )
  ],
  ['entries', method(Array.prototype.entries.length, (a) => new IteratorWrapper(a.entries()))],
  [
    'every',
    method(
      Array.prototype.every.length,
      (a, [fn], context) => findIndexBy(a, presentEntries(a), callback(fn, context), false) === -1
    )
  ],
  [
    'fill',
    method(Array.prototype.fill.length, (a, [value, start, end], context) =>
      asMutableOrThrow(a, context, 'fill').fill(value, optionalNumber(start), optionalNumber(end))
    )
  ],
  [
    'filter',
    method(Array.prototype.filter.length, (a, [fn], context) => {
      const call = callback(fn, context);
      const result: Array<unknown> = [];
      for (const [index, element] of presentEntries(a)) {
        if (call(element, index, a)) {
          result.push(element);
        }
      }
      return result;
    })
  ],
  // The find family visits holes as undefined, unlike the other callback methods
  [
    'find',
    method(
      Array.prototype.find.length,
      (a, [fn], context) => a[findIndexBy(a, indexedEntries(a), callback(fn, context), true)]
    )
  ],
  [
    'findIndex',
    method(Array.prototype.findIndex.length, (a, [fn], context) =>
      findIndexBy(a, indexedEntries(a), callback(fn, context), true)
    )
  ],
  [
    'findLast',
    method(
      Array.prototype.findLast.length,
      (a, [fn], context) =>
        a[findIndexBy(a, indexedEntries(a).toReversed(), callback(fn, context), true)]
    )
  ],
  [
    'findLastIndex',
    method(Array.prototype.findLastIndex.length, (a, [fn], context) =>
      findIndexBy(a, indexedEntries(a).toReversed(), callback(fn, context), true)
    )
  ],
  [
    'flat',
    method(Array.prototype.flat.length, (a, [depth], context) => {
      const result: Array<unknown> = [];
      flattenInto(result, a, depth === undefined ? 1 : Math.trunc(toNumber(depth)) || 0, context);
      return result;
    })
  ],
  [
    'flatMap',
    method(Array.prototype.flatMap.length, (a, [fn], context) => {
      const call = callback(fn, context);
      const result: Array<unknown> = [];
      for (const [index, element] of presentEntries(a)) {
        const mapped = call(element, index, a);
        if (Array.isArray(mapped)) {
          flattenInto(result, mapped, 0, context);
        } else {
          result.push(mapped);
        }
      }
      return result;
    })
  ],
  [
    'forEach',
    method(Array.prototype.forEach.length, (a, [fn], context) => {
      const call = callback(fn, context);
      for (const [index, element] of presentEntries(a)) {
        call(element, index, a);
      }
      return undefined;
    })
  ],
  [
    'includes',
    method(Array.prototype.includes.length, (a, [value, from]) =>
      a.includes(value, optionalNumber(from))
    )
  ],
  [
    'indexOf',
    method(Array.prototype.indexOf.length, (a, [value, from]) =>
      a.indexOf(value, optionalNumber(from))
    )
  ],
  [
    'join',
    method(Array.prototype.join.length, (a, [separator], { fail }) =>
      guardHostErrors(fail, () =>
        joinValues(a, separator === undefined ? ',' : toString(separator))
      )
    )
  ],
  ['keys', method(Array.prototype.keys.length, (a) => new IteratorWrapper(a.keys()))],
  [
    'lastIndexOf',
    method(Array.prototype.lastIndexOf.length, (a, args) =>
      args.length < 2 ? a.lastIndexOf(args[0]) : a.lastIndexOf(args[0], toNumber(args[1]))
    )
  ],
  [
    'map',
    method(Array.prototype.map.length, (a, [fn], context) => {
      const call = callback(fn, context);
      // The result keeps the holes of the source, which the callback never sees
      const result: Array<unknown> = [];
      result.length = a.length;
      for (const [index, element] of presentEntries(a)) {
        result[index] = call(element, index, a);
      }
      return result;
    })
  ],
  [
    'pop',
    method(Array.prototype.pop.length, (a, _args, context) =>
      asMutableOrThrow(a, context, 'pop').pop()
    )
  ],
  [
    'push',
    method(Array.prototype.push.length, (a, items, context) =>
      guardHostErrors(context.fail, () => asMutableOrThrow(a, context, 'push').push(...items))
    )
  ],
  [
    'reduce',
    method(Array.prototype.reduce.length, (a, args, context) => reduce(a, args, context, false))
  ],
  [
    'reduceRight',
    method(Array.prototype.reduceRight.length, (a, args, context) => reduce(a, args, context, true))
  ],
  [
    'reverse',
    method(Array.prototype.reverse.length, (a, _args, context) =>
      replaceContents(asMutableOrThrow(a, context, 'reverse'), a.toReversed())
    )
  ],
  [
    'shift',
    method(Array.prototype.shift.length, (a, _args, context) =>
      asMutableOrThrow(a, context, 'shift').shift()
    )
  ],
  [
    'slice',
    method(Array.prototype.slice.length, (a, [start, end]) =>
      a.slice(optionalNumber(start), optionalNumber(end))
    )
  ],
  [
    'some',
    method(
      Array.prototype.some.length,
      (a, [fn], context) => findIndexBy(a, presentEntries(a), callback(fn, context), true) !== -1
    )
  ],
  [
    'sort',
    method(Array.prototype.sort.length, (a, [fn], context) =>
      replaceContents(asMutableOrThrow(a, context, 'sort'), a.toSorted(comparator(fn, context)))
    )
  ],
  [
    'splice',
    method(Array.prototype.splice.length, (a, args, context) =>
      splice(asMutableOrThrow(a, context, 'splice'), args, (start, count, items) =>
        count === undefined ? a.splice(start) : a.splice(start, count, ...items)
      )
    )
  ],
  ['toReversed', method(Array.prototype.toReversed.length, (a) => a.toReversed())],
  [
    'toSorted',
    method(Array.prototype.toSorted.length, (a, [fn], context) =>
      a.toSorted(comparator(fn, context))
    )
  ],
  [
    'toSpliced',
    method(Array.prototype.toSpliced.length, (a, args) =>
      splice(a, args, (start, count, items) =>
        count === undefined ? a.toSpliced(start) : a.toSpliced(start, count, ...items)
      )
    )
  ],
  [
    'toLocaleString',
    method(Array.prototype.toLocaleString.length, (a, [locales, options], context) =>
      a.map((element) => elementToLocaleString(element, locales, options, context)).join(',')
    )
  ],
  ['toString', method(Array.prototype.toString.length, (a) => joinValues(a, ','))],
  [
    'unshift',
    method(Array.prototype.unshift.length, (a, items, context) =>
      guardHostErrors(context.fail, () => asMutableOrThrow(a, context, 'unshift').unshift(...items))
    )
  ],
  ['values', method(Array.prototype.values.length, (a) => new IteratorWrapper(a.values()))],
  [
    'with',
    method(Array.prototype.with.length, (a, [index, value], { fail }) =>
      guardHostErrors(fail, () => a.with(toNumber(index), value))
    )
  ]
]);

/** The script callback as a host function; a non-callable argument fails like the host would. */
function callback(fn: unknown, context: CallContext): Callback {
  if (!isCallable(fn)) {
    context.fail('TypeError', `${toString(fn)} is not a function`);
  }
  return (...args) => context.call(fn, args);
}

/**
 * Numbers and dates format for the locale, everything else converts hook-free, as the language has
 * it.
 */
function elementToLocaleString(
  element: unknown,
  locales: unknown,
  options: unknown,
  { fail }: CallContext
): string {
  if (element === null || element === undefined) {
    return '';
  }
  if (typeof element === 'number') {
    return guardHostErrors(fail, () =>
      element.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
    );
  }
  if (element instanceof DateWrapper) {
    return guardHostErrors(fail, () =>
      element.date.toLocaleString(localesArgument(locales), intlOptionsArgument(options))
    );
  }
  return toString(element);
}

/** Writes `contents` into `array` in place, which is how `sort` and `reverse` mutate and return it. */
function replaceContents(array: Array<unknown>, contents: ReadonlyArray<unknown>): Array<unknown> {
  for (const [index, element] of contents.entries()) {
    array[index] = element;
  }
  return array;
}

/** Input arrays are frozen; a mutator on one fails before it touches anything. */
function asMutableOrThrow(
  array: Array<unknown>,
  context: CallContext,
  methodName: string
): Array<unknown> {
  if (Object.isFrozen(array)) {
    return context.fail('TypeError', `Cannot call ${methodName} on a read-only array`);
  }
  return array;
}

/**
 * Appends the elements of `source` to `target`, opening nested arrays `depth` levels deep and
 * skipping holes. Every element visited costs an operation: an array reached through several
 * slots is walked once per slot, so a few operations can build a structure that takes
 * exponentially many steps to flatten.
 */
function flattenInto(
  target: Array<unknown>,
  source: ReadonlyArray<unknown>,
  depth: number,
  context: CallContext,
  nesting: number = 0
): void {
  if (nesting >= MAX_NESTING) {
    return context.fail(
      'RangeError',
      `An array nested deeper than ${MAX_NESTING} levels cannot be flattened`
    );
  }
  for (let index = 0; index < source.length; index++) {
    if (!Object.hasOwn(source, index)) {
      continue;
    }
    context.charge(1);
    const element = source[index];
    if (depth >= 1 && Array.isArray(element)) {
      flattenInto(target, element, depth - 1, context, nesting + 1);
    } else {
      target.push(element);
    }
  }
}

/**
 * Every index below `length` with its element, holes included as `undefined`. The length is fixed
 * when the loop starts, as the language specifies for these methods.
 */
function indexedEntries(array: ReadonlyArray<unknown>): Array<[number, unknown]> {
  const entries: Array<[number, unknown]> = [];
  for (let index = 0; index < array.length; index++) {
    entries.push([index, array[index]]);
  }
  return entries;
}

/** The elements that are there, which is what most callback methods visit: holes are skipped. */
function presentEntries(array: ReadonlyArray<unknown>): Array<[number, unknown]> {
  return indexedEntries(array).filter(([index]) => Object.hasOwn(array, index));
}

/** The first index among `entries` whose callback result has truthiness `truthy`. */
function findIndexBy(
  array: ReadonlyArray<unknown>,
  entries: ReadonlyArray<[number, unknown]>,
  call: Callback,
  truthy: boolean
): number {
  for (const [index, element] of entries) {
    if (Boolean(call(element, index, array)) === truthy) {
      return index;
    }
  }
  return -1;
}

function reduce(
  array: ReadonlyArray<unknown>,
  args: ReadonlyArray<unknown>,
  context: CallContext,
  fromEnd: boolean
): unknown {
  const call = callback(args[0], context);
  const entries = presentEntries(array);
  if (fromEnd) {
    entries.reverse();
  }
  let accumulator: unknown;
  if (args.length > 1) {
    accumulator = args[1];
  } else {
    const first = entries.shift();
    if (!first) {
      context.fail('TypeError', 'Reduce of empty array with no initial value');
    }
    accumulator = first[1];
  }
  for (const [index, element] of entries) {
    accumulator = call(accumulator, element, index, array);
  }
  return accumulator;
}

/** `sort` without a comparator orders by the hook-free string form, undefined last. */
function comparator(fn: unknown, context: CallContext): (left: unknown, right: unknown) => number {
  if (fn === undefined) {
    return compareDefault;
  }
  const call = callback(fn, context);
  return (left, right) => {
    const order = toNumber(call(left, right));
    return Number.isNaN(order) ? 0 : order;
  };
}

function compareDefault(left: unknown, right: unknown): number {
  if (left === undefined) {
    return right === undefined ? 0 : 1;
  }
  if (right === undefined) {
    return -1;
  }
  const leftText = toString(left);
  const rightText = toString(right);
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

/** `splice()` removes nothing and `splice(start)` removes to the end, which only the arity tells. */
function splice(
  array: Array<unknown>,
  args: ReadonlyArray<unknown>,
  apply: (start: number, count: number | undefined, items: ReadonlyArray<unknown>) => Array<unknown>
): Array<unknown> {
  if (args.length === 0) {
    return apply(array.length, 0, []);
  }
  const [start, count, ...items] = args;
  return apply(toNumber(start), args.length === 1 ? undefined : toNumber(count), items);
}
