import { ARRAY_MAX_LENGTH } from '../builtins/array/array.ts';
import { isPlainObject } from '../support/is-plain-object.ts';
import { isArgumentsObject } from './arguments-object.ts';
import { describeObject, toNumber, toString, typeOf } from './coercion.ts';
import { guardIntegrityErrors } from './guard-integrity-errors.ts';
import type { OwnProperties } from './own-properties.ts';
import type { RunState } from './run-state.ts';
import { SandboxObject } from './sandbox-object.ts';

/** Raises a catchable sandbox error at the node the caller is evaluating. */
export type Fail = (name: string, message: string) => never;

/** Charges operations against the run's budget, or ends the run when they do not fit. */
export type Charge = (count: number) => void;

/**
 * What a member operation needs from the run: where to raise an error, the budget to charge
 * growth to, and the run's own state for the values every run shares.
 */
export interface MemberContext {
  readonly fail: Fail;
  readonly charge: Charge;
  readonly runState: RunState;
}

/** Finds the built-in method a receiver's type offers under `key`. */
export type MethodLookup = (receiver: unknown, key: string) => unknown;

/** Keys that lead to host prototypes; blocked on every value, static or computed. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

export function toPropertyKey(value: unknown): string {
  return toString(value);
}

export function assertAllowedKey(key: string, fail: Fail): void {
  if (FORBIDDEN_KEYS.has(key)) {
    fail('TypeError', `Access to '${key}' is not allowed`);
  }
}

/** Reads an own property, otherwise the method `methodOf` finds; prototypes are never consulted. */
export function readMember(
  target: unknown,
  key: string,
  context: MemberContext,
  methodLookup: MethodLookup
): unknown {
  const fail = context.fail;
  const runState = context.runState;

  if (target === undefined || target === null) {
    return fail('TypeError', `Cannot read properties of ${String(target)} (reading '${key}')`);
  }

  assertAllowedKey(key, fail);

  if (typeof target === 'string') {
    if (key === 'length') {
      return target.length;
    }
    const index = toArrayIndex(key);
    return index === undefined ? methodLookup(target, key) : target[index];
  }

  if (typeof target !== 'object') {
    return methodLookup(target, key);
  }

  if (target instanceof SandboxObject) {
    return target.getProperty(key, runState, methodLookup);
  }

  if (key === 'callee' && isArgumentsObject(target)) {
    return fail('TypeError', "'callee' may not be accessed on the arguments object in strict mode");
  }

  if (Array.isArray(target) || isPlainObject(target)) {
    return Object.hasOwn(target, key) ? Reflect.get(target, key) : methodLookup(target, key);
  }

  throw new Error('A value of an unknown kind was read');
}

/** Writes a property on a target object */
export function setMember(
  target: unknown,
  key: string,
  value: unknown,
  context: MemberContext
): void {
  const { fail, charge } = context;
  if (target === undefined || target === null) {
    return fail('TypeError', `Cannot set properties of ${String(target)} (setting '${key}')`);
  }

  // Prevent scripts from assigning to properties that are not allowed (like "__proto__" etc.)
  assertAllowedKey(key, fail);

  if (typeof target !== 'object') {
    return fail('TypeError', `Cannot create property '${key}' on ${typeOf(target)}`);
  }

  if (target instanceof SandboxObject) {
    return target.setProperty(key, value, context);
  }

  // Arrays and plain objects are the host's own, so their attributes decide, as in JavaScript
  const own = Object.getOwnPropertyDescriptor(target, key);
  if (own && own.writable === false) {
    return fail('TypeError', `Cannot assign to read-only property '${key}'`);
  }
  if (!own && !Object.isExtensible(target)) {
    return fail('TypeError', `Cannot add property ${key}, object is not extensible`);
  }

  if (Array.isArray(target)) {
    if (key === 'length') {
      const length = toNumber(value);
      if (!Number.isInteger(length) || length < 0 || length > ARRAY_MAX_LENGTH) {
        return fail('RangeError', 'Invalid array length');
      }
      charge(Math.max(0, length - target.length));
      // Shrinking a sealed array deletes elements it may not delete
      guardIntegrityErrors(fail, target, () => {
        target.length = length;
      });
      return;
    }
    const index = toArrayIndex(key);
    if (index !== undefined && index < ARRAY_MAX_LENGTH && index >= target.length) {
      charge(index + 1 - target.length);
    }
    Reflect.set(target, key, value);
    return;
  }

  if (key === 'length' && isArgumentsObject(target)) {
    // An assignment keeps `length` non-enumerable, as it is on a real arguments object
    Reflect.set(target, key, value);
    return;
  }

  if (isPlainObject(target)) {
    // An existing property keeps its attributes; a new one is created as an assignment creates it
    if (own) {
      Reflect.set(target, key, value);
      return;
    }
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true
    });
    return;
  }

  throw new Error('A value of an unknown kind was written');
}

export function deleteMember(target: unknown, key: string, context: MemberContext): boolean {
  const fail = context.fail;

  if (target === undefined || target === null) {
    return fail('TypeError', `Cannot convert ${String(target)} to object`);
  }

  // Ensure the key is allowed before attempting to delete it
  assertAllowedKey(key, fail);

  if (target instanceof SandboxObject) {
    return target.deleteProperty(key, context);
  }

  if (typeof target !== 'object') {
    return true;
  }

  if (!Reflect.deleteProperty(target, key)) {
    return fail('TypeError', `Cannot delete property '${key}' of ${describeObject(target)}`);
  }
  return true;
}

/** The `in` operator over own properties, which is all the sandbox has. */
export function hasMember(target: unknown, key: string, context: MemberContext): boolean {
  const fail = context.fail;
  const runState = context.runState;

  if (typeof target !== 'object' || target === null) {
    return fail(
      'TypeError',
      `Cannot use 'in' operator to search for '${key}' in ${toString(target)}`
    );
  }

  if (target instanceof SandboxObject) {
    return target.hasProperty(key, runState);
  }

  return Object.hasOwn(target, key);
}

/** The own property names `in` answers `true` for, enumerable or not, for `getOwnPropertyNames`. */
export function ownPropertyNames(target: unknown, runState: RunState): Array<string> {
  if (typeof target === 'string') {
    return [...Object.keys(target), 'length'];
  }

  if (typeof target !== 'object' || target === null) {
    return [];
  }

  if (target instanceof SandboxObject) {
    return target.ownKeys(runState);
  }

  return Object.getOwnPropertyNames(target);
}

/**
 * What object spread and object rest copy: own enumerable entries of objects, arrays and strings,
 * one at a time, so a caller can charge each entry before the next exists.
 */
export function* ownEntries(value: unknown, runState: RunState): Generator<[string, unknown]> {
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index++) {
      yield [String(index), value.charAt(index)];
    }
    return;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      yield [key, Reflect.get(value, key)];
    }
    return;
  }
  const properties = getOwnPropertiesOf(value, runState);
  for (const key of properties?.enumerableKeys() ?? []) {
    yield [key, properties?.getAdded(key)?.value];
  }
}

/**
 * The state of the own properties of a value that is not a plain object or an array; for a
 * built-in or host function, which every run shares, what `runState`'s run made of them.
 */
export function getOwnPropertiesOf(value: unknown, runState: RunState): OwnProperties | undefined {
  return value instanceof SandboxObject ? value.getOwnProperties(runState) : undefined;
}

/** The canonical array index a key denotes, if any: `'1'` but not `'01'` or `'1.5'`. */
export function toArrayIndex(key: string): number | undefined {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && String(index) === key ? index : undefined;
}
