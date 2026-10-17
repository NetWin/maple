import { isPlainObject } from '../support/is-plain-object.ts';
import { type Fail, readMember } from '../values/members.ts';
import { isCallable, type Method, NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import {
  DateWrapper,
  IteratorWrapper,
  MapWrapper,
  RegExpWrapper,
  SetWrapper
} from '../values/wrappers.ts';
import { ARRAY_METHODS } from './array/array-methods.ts';
import { BOOLEAN_METHODS } from './boolean/boolean-methods.ts';
import { DATE_METHODS } from './date/date-methods.ts';
import { ERROR_METHODS } from './error/error-methods.ts';
import { FUNCTION_METHODS } from './function/function-methods.ts';
import { ITERATOR_METHODS } from './iterator/iterator-methods.ts';
import { MAP_METHODS } from './map/map-methods.ts';
import { NUMBER_METHODS } from './number/number-methods.ts';
import { OBJECT_METHODS } from './object/object-methods.ts';
import { REGEXP_METHODS } from './regexp/regexp-methods.ts';
import { SET_METHODS } from './set/set-methods.ts';
import { STRING_METHODS } from './string/string-methods.ts';

/** Reads a property as scripts see it: an own property, otherwise the receiver type's method. */
export function getMember(target: unknown, key: string, fail: Fail): unknown {
  return readMember(target, key, fail, (receiver) => resolveMethod(receiver, key));
}

/**
 * The method a receiver type offers under `key`, bound to that receiver, or `undefined`. This is
 * how `s.trim` resolves: through a table for the type, never through a host prototype.
 */
export function resolveMethod(receiver: unknown, key: string): NativeFunction | undefined {
  const methodDefinition = getMethodDefinition(receiver, key);
  if (methodDefinition === undefined) {
    return undefined;
  }
  return bind(receiver, key, methodDefinition);
}

/** Checks if a receiver type has a method under the given key. */
export function hasMethod(receiver: unknown, key: string): boolean {
  return getMethodDefinition(receiver, key) !== undefined;
}

/**
 * Gets the method definition for a receiver type under the given key,
 * or `undefined` if none exists.
 */
function getMethodDefinition(receiver: unknown, key: string): Method<any> | undefined {
  if (typeof receiver === 'string') {
    return STRING_METHODS.get(key);
  }
  if (typeof receiver === 'number') {
    return NUMBER_METHODS.get(key);
  }
  if (typeof receiver === 'boolean') {
    return BOOLEAN_METHODS.get(key);
  }
  if (Array.isArray(receiver)) {
    return ARRAY_METHODS.get(key);
  }
  if (isPlainObject(receiver)) {
    return OBJECT_METHODS.get(key);
  }
  if (receiver instanceof RegExpWrapper) {
    return REGEXP_METHODS.get(key);
  }
  if (receiver instanceof DateWrapper) {
    return DATE_METHODS.get(key);
  }
  if (receiver instanceof MapWrapper) {
    return MAP_METHODS.get(key);
  }
  if (receiver instanceof SetWrapper) {
    return SET_METHODS.get(key);
  }
  if (receiver instanceof SandboxError) {
    return ERROR_METHODS.get(key);
  }
  if (receiver instanceof IteratorWrapper) {
    return ITERATOR_METHODS.get(key);
  }
  if (isCallable(receiver)) {
    return FUNCTION_METHODS.get(key);
  }
  return undefined;
}

function bind<Receiver>(
  receiver: Receiver,
  key: string,
  method: Method<Receiver> | undefined
): NativeFunction | undefined {
  if (!method) {
    return undefined;
  }
  return new NativeFunction(key, method.length, (args, context) => {
    return method.call(receiver, args, context);
  });
}
