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
import { ERROR_METHODS } from './error-methods.ts';
import { FUNCTION_METHODS } from './function-methods.ts';
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
  if (typeof receiver === 'string') {
    return bind(receiver, key, STRING_METHODS.get(key));
  }
  if (typeof receiver === 'number') {
    return bind(receiver, key, NUMBER_METHODS.get(key));
  }
  if (typeof receiver === 'boolean') {
    return bind(receiver, key, BOOLEAN_METHODS.get(key));
  }
  if (Array.isArray(receiver)) {
    return bind(receiver, key, ARRAY_METHODS.get(key));
  }
  if (isPlainObject(receiver)) {
    return bind(receiver, key, OBJECT_METHODS.get(key));
  }
  if (receiver instanceof RegExpWrapper) {
    return bind(receiver, key, REGEXP_METHODS.get(key));
  }
  if (receiver instanceof DateWrapper) {
    return bind(receiver, key, DATE_METHODS.get(key));
  }
  if (receiver instanceof MapWrapper) {
    return bind(receiver, key, MAP_METHODS.get(key));
  }
  if (receiver instanceof SetWrapper) {
    return bind(receiver, key, SET_METHODS.get(key));
  }
  if (receiver instanceof SandboxError) {
    return bind(receiver, key, ERROR_METHODS.get(key));
  }
  if (receiver instanceof IteratorWrapper) {
    return bind(receiver, key, ITERATOR_METHODS.get(key));
  }
  if (isCallable(receiver)) {
    return bind(receiver, key, FUNCTION_METHODS.get(key));
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
