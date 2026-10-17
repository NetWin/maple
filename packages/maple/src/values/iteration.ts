import { isPlainObject } from '../support/is-plain-object.ts';
import { isArgumentsObject } from './arguments-object.ts';
import { toLength } from './coercion.ts';
import { IteratorWrapper, MapWrapper, SetWrapper } from './wrappers.ts';

/**
 * The values `for...of` and friends visit, or `undefined` when the value is not iterable. A Map
 * yields fresh `[key, value]` arrays, an iterator wrapper is consumed as it is.
 */
export function iterate(value: unknown): Iterator<unknown> | undefined {
  if (typeof value === 'string') {
    return value[Symbol.iterator]();
  }
  if (Array.isArray(value)) {
    return arrayIterator(value);
  }
  if (isArgumentsObject(value)) {
    return argumentsIterator(value);
  }
  if (value instanceof MapWrapper) {
    return value.map.entries();
  }
  if (value instanceof SetWrapper) {
    return value.set.values();
  }
  if (value instanceof IteratorWrapper) {
    return value.iterator;
  }
  return undefined;
}

/**
 * A sandbox iterable as a host iterable, for host built-ins such as `Object.groupBy`, or
 * `undefined` when the value is not iterable.
 */
export function asHostIterable(value: unknown): Iterable<unknown> | undefined {
  const iterator = iterate(value);
  return iterator && { [Symbol.iterator]: (): Iterator<unknown> => iterator };
}

/** The keys `for...in` visits: own enumerable keys of plain objects, arrays and strings. */
export function* enumerableKeys(value: unknown): Generator<string> {
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index++) {
      yield String(index);
    }
    return;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    // The keys are taken when the loop starts, so one added later is not visited, but one deleted
    // before its turn is skipped, as the language requires
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(value, key)) {
        yield key;
      }
    }
  }
}

/**
 * Visits the indices below `length`, as the array iterator an arguments object has does: the
 * length is read and converted on every step.
 */
function* argumentsIterator(args: Record<string, unknown>): Iterator<unknown> {
  for (let index = 0; index < toLength(args['length']); index++) {
    yield args[String(index)];
  }
}

/** Reads the length on every step, so elements appended during the loop are visited. */
function* arrayIterator(array: ReadonlyArray<unknown>): Iterator<unknown> {
  for (let index = 0; index < array.length; index++) {
    yield array[index];
  }
}
