import { type Fail, readMember } from '../values/members.ts';
import type { NativeFunction } from '../values/native.ts';
import type { Prototype } from '../values/prototype.ts';
import { ARRAY_PROTOTYPE } from './array/array-prototype.ts';
import { BOOLEAN_PROTOTYPE } from './boolean/boolean-prototype.ts';
import { DATE_PROTOTYPE } from './date/date-prototype.ts';
import { ERROR_PROTOTYPE } from './error/error-prototype.ts';
import { FUNCTION_PROTOTYPE } from './function/function-prototype.ts';
import { ITERATOR_PROTOTYPE } from './iterator/iterator-prototype.ts';
import { MAP_PROTOTYPE } from './map/map-prototype.ts';
import { NUMBER_PROTOTYPE } from './number/number-prototype.ts';
import { OBJECT_PROTOTYPE } from './object/object-prototype.ts';
import { REGEXP_PROTOTYPE } from './regexp/regexp-prototype.ts';
import { SET_PROTOTYPE } from './set/set-prototype.ts';
import { STRING_PROTOTYPE } from './string/string-prototype.ts';

/**
 * Every prototype a value can have, tried in order, so arrays find theirs before plain objects
 * would and functions come last.
 */
const PROTOTYPES: ReadonlyArray<Prototype> = [
  STRING_PROTOTYPE,
  NUMBER_PROTOTYPE,
  BOOLEAN_PROTOTYPE,
  ARRAY_PROTOTYPE,
  OBJECT_PROTOTYPE,
  REGEXP_PROTOTYPE,
  DATE_PROTOTYPE,
  MAP_PROTOTYPE,
  SET_PROTOTYPE,
  ERROR_PROTOTYPE,
  ITERATOR_PROTOTYPE,
  FUNCTION_PROTOTYPE
];

/** Reads a property as scripts see it: an own property, otherwise the receiver type's method. */
export function getMember(target: unknown, key: string, fail: Fail): unknown {
  return readMember(target, key, fail, (receiver) => resolveMethod(receiver, key));
}

/**
 * The method a receiver type offers under `key`, or `undefined`. This is how `s.trim` resolves:
 * through the prototype of the type, never through a host prototype. It is the same function for
 * every value of the type; the call supplies the receiver.
 */
export function resolveMethod(receiver: unknown, key: string): NativeFunction | undefined {
  return prototypeOf(receiver)?.resolve(key);
}

/** Checks if a receiver type has a method under the given key. */
export function hasMethod(receiver: unknown, key: string): boolean {
  return prototypeOf(receiver)?.has(key) ?? false;
}

function prototypeOf(receiver: unknown): Prototype | undefined {
  return PROTOTYPES.find((prototype) => prototype.receives(receiver));
}
