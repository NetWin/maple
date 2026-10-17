import { ARRAY_MAX_LENGTH } from '../builtins/array/array.ts';
import { isPlainObject } from '../support/is-plain-object.ts';
import { isArgumentsObject } from './arguments-object.ts';
import { Builtin } from './builtin.ts';
import { Closure } from './closure.ts';
import { toNumber, toString, typeOf } from './coercion.ts';
import { NativeFunction } from './native.ts';
import { SandboxError } from './sandbox-error.ts';
import { isWrapper, MapWrapper, RegExpWrapper, SetWrapper, wrapperKind } from './wrappers.ts';

/** Raises a catchable sandbox error at the node the caller is evaluating. */
export type Fail = (name: string, message: string) => never;

/** Charges operations against the run's budget, or ends the run when they do not fit. */
export type Charge = (count: number) => void;

/** Finds the built-in method a receiver's type offers under `key`. */
export type MethodLookup = (receiver: unknown, key: string) => unknown;

type RegExpProperty = (r: RegExpWrapper) => unknown;

/** The readable properties of a regexp; `lastIndex` is also the one writable property. */
const REGEXP_PROPERTIES: ReadonlyMap<string, RegExpProperty> = new Map<string, RegExpProperty>([
  ['lastIndex', (r) => r.regexp.lastIndex],
  ['source', (r) => r.regexp.source],
  ['flags', (r) => r.regexp.flags],
  ['global', (r) => r.regexp.global],
  ['ignoreCase', (r) => r.regexp.ignoreCase],
  ['multiline', (r) => r.regexp.multiline],
  ['sticky', (r) => r.regexp.sticky],
  ['unicode', (r) => r.regexp.unicode],
  ['dotAll', (r) => r.regexp.dotAll],
  ['hasIndices', (r) => r.regexp.hasIndices],
  ['unicodeSets', (r) => r.regexp.unicodeSets]
]);

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
  fail: Fail,
  methodLookup: MethodLookup
): unknown {
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
  if (target instanceof Closure || target instanceof NativeFunction) {
    return isFunctionProperty(target, key) ? target[key] : methodLookup(target, key);
  }
  if (target instanceof SandboxError) {
    switch (key) {
      case 'name':
        return target.name;
      case 'message':
        return target.message;
      case 'stack':
        return target.stack;
      default:
        return methodLookup(target, key);
    }
  }
  if (target instanceof Builtin) {
    if (target.members.has(key)) {
      return target.members.get(key);
    }
    return isFunctionProperty(target, key) ? target[key] : methodLookup(target, key);
  }
  if (key === 'callee' && isArgumentsObject(target)) {
    return fail('TypeError', "'callee' may not be accessed on the arguments object in strict mode");
  }
  if (Array.isArray(target) || isPlainObject(target)) {
    return Object.hasOwn(target, key) ? Reflect.get(target, key) : methodLookup(target, key);
  }
  if (target instanceof RegExpWrapper) {
    const property = REGEXP_PROPERTIES.get(key);
    return property ? property(target) : methodLookup(target, key);
  }
  if (target instanceof MapWrapper) {
    return key === 'size' ? target.map.size : methodLookup(target, key);
  }
  if (target instanceof SetWrapper) {
    return key === 'size' ? target.set.size : methodLookup(target, key);
  }
  if (isWrapper(target)) {
    return methodLookup(target, key);
  }
  throw new Error('A value of an unknown kind was read');
}

/** Writes a property on a target object */
export function setMember(
  target: unknown,
  key: string,
  value: unknown,
  fail: Fail,
  charge: Charge
): void {
  if (target === undefined || target === null) {
    return fail('TypeError', `Cannot set properties of ${String(target)} (setting '${key}')`);
  }
  assertAllowedKey(key, fail);
  if (typeof target !== 'object' || target instanceof Closure || target instanceof NativeFunction) {
    return fail('TypeError', `Cannot create property '${key}' on ${typeOf(target)}`);
  }
  if (target instanceof SandboxError) {
    if (Object.isFrozen(target)) {
      return fail('TypeError', `Cannot assign to read-only property '${key}'`);
    }
    if (key === 'name') {
      target.name = toString(value);
      return;
    }
    if (key === 'message') {
      target.message = toString(value);
      return;
    }
    if (key === 'stack') {
      return fail('TypeError', `Cannot assign to read-only property '${key}'`);
    }
    return fail('TypeError', `Cannot add property '${key}' to an error`);
  }
  if (target instanceof RegExpWrapper) {
    if (key !== 'lastIndex') {
      return fail('TypeError', `Cannot add property '${key}' to a RegExp`);
    }
    if (target.frozen) {
      return fail('TypeError', `Cannot assign to read-only property '${key}'`);
    }
    target.regexp.lastIndex = toNumber(value);
    return;
  }
  if (isWrapper(target)) {
    return fail('TypeError', `Cannot add property '${key}' to a ${wrapperKind(target)}`);
  }
  if (target instanceof Builtin || Object.isFrozen(target)) {
    return fail('TypeError', `Cannot assign to read-only property '${key}'`);
  }
  if (Array.isArray(target)) {
    if (key === 'length') {
      const length = toNumber(value);
      if (!Number.isInteger(length) || length < 0 || length > ARRAY_MAX_LENGTH) {
        return fail('RangeError', 'Invalid array length');
      }
      charge(Math.max(0, length - target.length));
      target.length = length;
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

export function deleteMember(target: unknown, key: string, fail: Fail): boolean {
  if (target === undefined || target === null) {
    return fail('TypeError', `Cannot convert ${String(target)} to object`);
  }
  assertAllowedKey(key, fail);
  if (
    typeof target !== 'object' ||
    target instanceof Closure ||
    target instanceof NativeFunction ||
    target instanceof SandboxError ||
    isWrapper(target)
  ) {
    return true;
  }
  if (target instanceof Builtin || Object.isFrozen(target)) {
    return fail('TypeError', `Cannot delete property '${key}' of a read-only object`);
  }
  return Reflect.deleteProperty(target, key);
}

/** The `in` operator over own properties, which is all the sandbox has. */
export function hasMember(target: unknown, key: string, fail: Fail): boolean {
  if (typeof target !== 'object' || target === null) {
    return fail(
      'TypeError',
      `Cannot use 'in' operator to search for '${key}' in ${toString(target)}`
    );
  }
  if (target instanceof Closure || target instanceof NativeFunction) {
    return isFunctionProperty(target, key);
  }
  if (target instanceof SandboxError) {
    return key === 'name' || key === 'message' || key === 'stack';
  }
  if (target instanceof Builtin) {
    return target.members.has(key) || isFunctionProperty(target, key);
  }
  if (target instanceof RegExpWrapper) {
    return REGEXP_PROPERTIES.has(key);
  }
  if (target instanceof MapWrapper || target instanceof SetWrapper) {
    return key === 'size';
  }
  if (isWrapper(target)) {
    return false;
  }
  return Object.hasOwn(target, key);
}

/** The own property names `in` answers `true` for, enumerable or not, for `getOwnPropertyNames`. */
export function ownPropertyNames(target: unknown): Array<string> {
  if (typeof target === 'string') {
    return [...Object.keys(target), 'length'];
  }
  if (typeof target !== 'object' || target === null) {
    return [];
  }
  if (target instanceof Closure || target instanceof NativeFunction) {
    return functionProperties(target);
  }
  if (target instanceof SandboxError) {
    return ['name', 'message', 'stack'];
  }
  if (target instanceof Builtin) {
    return [...functionProperties(target), ...target.members.keys()];
  }
  if (target instanceof RegExpWrapper) {
    return [...REGEXP_PROPERTIES.keys()];
  }
  if (target instanceof MapWrapper || target instanceof SetWrapper) {
    return ['size'];
  }
  if (isWrapper(target)) {
    return [];
  }
  return Object.getOwnPropertyNames(target);
}

/**
 * What object spread and object rest copy: own enumerable entries of objects, arrays and strings,
 * one at a time, so a caller can charge each entry before the next exists.
 */
export function* ownEntries(value: unknown): Generator<[string, unknown]> {
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
  }
}

type FunctionProperty = 'length' | 'name';

/**
 * The properties a function shows: `length` and `name` on a script function, a built-in and a
 * callable global. A host function and a namespace have no length and show none, since a host
 * function's name and arity are the host's business.
 */
function functionProperties(target: Closure | NativeFunction | Builtin): Array<FunctionProperty> {
  return target.length === undefined ? [] : ['length', 'name'];
}

function isFunctionProperty(
  target: Closure | NativeFunction | Builtin,
  key: string
): key is FunctionProperty {
  return target.length !== undefined && (key === 'length' || key === 'name');
}

/** The canonical array index a key denotes, if any: `'1'` but not `'01'` or `'1.5'`. */
export function toArrayIndex(key: string): number | undefined {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && String(index) === key ? index : undefined;
}
