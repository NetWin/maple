import { isPlainObject } from '../support/is-plain-object.ts';
import { defineOwn } from '../support/own-property.ts';
import { Closure } from '../values/closure.ts';
import { toString } from '../values/coercion.ts';
import { asHostIterable, iterate } from '../values/iteration.ts';
import {
  type Fail,
  hasMember,
  ownEntries,
  ownPropertyNames,
  setMember,
  toArrayIndex,
  toPropertyKey
} from '../values/members.ts';
import { type CallContext, isCallable, NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import { isWrapper, IteratorWrapper } from '../values/wrappers.ts';
import { getMember } from './method-dispatch.ts';

/** The `Object.*` functions; all of them see own enumerable properties and nothing else. */
export const OBJECT_STATICS: Readonly<Record<string, NativeFunction>> = {
  keys: new NativeFunction('keys', Object.keys.length, ([target], { fail }) =>
    Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail)), ([key]) => key)
  ),
  values: new NativeFunction('values', Object.values.length, ([target], { fail }) =>
    Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail)), ([, value]) => value)
  ),
  entries: new NativeFunction('entries', Object.entries.length, ([target], { fail }) =>
    Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail)))
  ),
  fromEntries: new NativeFunction('fromEntries', Object.fromEntries.length, ([iterable], context) =>
    fromEntries(iterable, context)
  ),
  assign: new NativeFunction(
    'assign',
    Object.assign.length,
    ([target, ...sources], { fail, charge }) => {
      if (typeof target !== 'object' || target === null) {
        return fail('TypeError', 'Object.assign needs an object as its target');
      }
      for (const source of sources) {
        for (const [key, value] of ownEntries(source)) {
          setMember(target, key, value, fail, charge);
        }
      }
      return target;
    }
  ),
  hasOwn: new NativeFunction('hasOwn', Object.hasOwn.length, ([target, key], { fail }) =>
    hasOwn(asObjectCoercibleOrThrow(target, fail), toPropertyKey(key), fail)
  ),
  is: new NativeFunction('is', Object.is.length, ([left, right]) => Object.is(left, right)),
  getOwnPropertyNames: new NativeFunction(
    'getOwnPropertyNames',
    Object.getOwnPropertyNames.length,
    ([target], { fail }) => ownPropertyNames(asObjectCoercibleOrThrow(target, fail))
  ),
  freeze: new NativeFunction('freeze', Object.freeze.length, ([target]) => freeze(target)),
  isFrozen: new NativeFunction('isFrozen', Object.isFrozen.length, ([target]) => isFrozen(target)),
  groupBy: new NativeFunction('groupBy', Object.groupBy.length, ([items, callback], context) => {
    const iterable = asHostIterable(items);
    if (!iterable) {
      return context.fail('TypeError', `${toString(items)} is not iterable`);
    }
    if (!isCallable(callback)) {
      return context.fail('TypeError', `${toString(callback)} is not a function`);
    }
    // Converting the key here keeps the host from running its own conversion on a script object
    return Object.groupBy(iterable, (item, index) =>
      toPropertyKey(context.call(callback, [item, index]))
    );
  })
};

/**
 * `Object(...)` and `new Object(...)`, which do the same: a fresh object for nothing, `null` or
 * `undefined`, and the value itself when it already is an object. A primitive would need a
 * wrapper object, which the value model does not have.
 */
export function constructObject(args: ReadonlyArray<unknown>, { fail }: CallContext): unknown {
  const [value] = args;
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value === 'object' || isCallable(value)) {
    return value;
  }
  return fail(
    'TypeError',
    `Object(${typeof value}) is not supported: there are no wrapper objects`
  );
}

function asObjectCoercibleOrThrow(value: unknown, fail: Fail): unknown {
  if (value === undefined || value === null) {
    return fail('TypeError', `Cannot convert ${String(value)} to object`);
  }
  return value;
}

/** Each entry is read like `entry[0]` and `entry[1]` would be, so any array-like pair works. */
function fromEntries(iterable: unknown, context: CallContext): Record<string, unknown> {
  const { fail } = context;
  const iterator = iterate(iterable);
  if (!iterator) {
    return fail('TypeError', `${toString(iterable)} is not iterable`);
  }
  const result: Record<string, unknown> = {};
  for (let step = iterator.next(); !step.done; step = iterator.next()) {
    const entry: unknown = step.value;
    if (typeof entry !== 'object' || entry === null || entry instanceof Closure) {
      return fail('TypeError', `Iterator value ${toString(entry)} is not an entry object`);
    }
    defineOwn(result, toPropertyKey(getMember(entry, '0', fail)), getMember(entry, '1', fail));
  }
  return result;
}

/** `Object.hasOwn` also answers for strings, whose own keys are the indices and `length`. */
function hasOwn(target: unknown, key: string, fail: Fail): boolean {
  if (typeof target === 'string') {
    const index = toArrayIndex(key);
    return key === 'length' || (index !== undefined && index < target.length);
  }
  return typeof target === 'object' && target !== null ? hasMember(target, key, fail) : false;
}

/**
 * Freezing reaches what the script can write to: objects, arrays and errors. Everything else is
 * returned as it is, as the language does for primitives.
 */
function freeze(target: unknown): unknown {
  if (Array.isArray(target) || isPlainObject(target) || target instanceof SandboxError) {
    Object.freeze(target);
  }
  return target;
}

/**
 * Functions and namespaces cannot be written to, so they count as frozen; collections from the
 * input are read-only and count as frozen too.
 */
function isFrozen(target: unknown): boolean {
  if (Array.isArray(target) || isPlainObject(target) || target instanceof SandboxError) {
    return Object.isFrozen(target);
  }
  if (target instanceof IteratorWrapper) {
    return false;
  }
  if (isWrapper(target) && 'frozen' in target) {
    return target.frozen;
  }
  return true;
}
