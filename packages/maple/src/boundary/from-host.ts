import { isPlainObject } from '../support/is-plain-object.ts';
import { MAX_NESTING } from '../support/nesting-limit.ts';
import { defineOwn } from '../support/own-property.ts';
import { toArrayIndex } from '../values/members.ts';
import { NativeFunction, type NativeImplementation } from '../values/native.ts';
import { DateWrapper } from '../values/wrappers/date-wrapper.ts';
import { MapWrapper } from '../values/wrappers/map-wrapper.ts';
import { RegExpWrapper } from '../values/wrappers/regexp-wrapper.ts';
import { SetWrapper } from '../values/wrappers/set-wrapper.ts';
import { isHostFunction, isIntrinsic } from './host.ts';

export interface FromHostOptions {
  /** Input and globals are frozen on the way in; a host function's return value is the script's. */
  freeze?: boolean;
  /** Functions in input and globals become host functions; a host function may not return one. */
  functions?: boolean;
}

interface Settings {
  freeze: boolean;
  functions: boolean;
}

/**
 * Copies a host value into the sandbox's value model. Throws a `TypeError` naming the path of
 * the first value the model does not cover, or that is nested deeper than `MAX_NESTING`.
 */
export function fromHost(
  value: unknown,
  path: string = 'value',
  options: FromHostOptions = {}
): unknown {
  const settings: Settings = {
    freeze: options.freeze ?? true,
    functions: options.functions ?? true
  };
  return convert(value, path, new Map(), settings, 0);
}

function convert(
  value: unknown,
  path: string,
  copies: Map<object, object>,
  settings: Settings,
  depth: number
): unknown {
  if (depth > MAX_NESTING) {
    throw unsupported(path, `nested deeper than ${MAX_NESTING} levels`);
  }
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    if (typeof value === 'symbol' || typeof value === 'bigint') {
      throw unsupported(path, typeof value);
    }
    return value;
  }

  const existing = copies.get(value);
  if (existing) {
    return existing;
  }

  if (isHostFunction(value)) {
    if (!settings.functions) {
      throw unsupported(path, 'function');
    }
    const name = value.name === '' ? path : value.name;
    // No length, so the script sees no properties on a host function
    const impl: NativeImplementation = isIntrinsic(value)
      ? (_, args, context) => context.invokeIntrinsic(value, args)
      : (_, args, context) => context.invokeHost(value, args);
    const native = new NativeFunction(name, undefined, impl);
    copies.set(value, native);
    return native;
  }
  const { freeze } = settings;

  if (Array.isArray(value)) {
    // Own keys rather than the iterator keep holes as holes and named properties such as the
    // `index`, `input` and `groups` of a match result
    const copy: Array<unknown> = [];
    copy.length = value.length;
    copies.set(value, copy);
    for (const key of Object.keys(value)) {
      const keyPath = toArrayIndex(key) === undefined ? `${path}.${key}` : `${path}[${key}]`;
      defineOwn(copy, key, convert(Reflect.get(value, key), keyPath, copies, settings, depth + 1));
    }
    return freeze ? Object.freeze(copy) : copy;
  }

  if (isPlainObject(value)) {
    const copy: Record<string, unknown> = {};
    copies.set(value, copy);
    for (const key of Object.keys(value)) {
      defineOwn(copy, key, convert(value[key], `${path}.${key}`, copies, settings, depth + 1));
    }
    return freeze ? Object.freeze(copy) : copy;
  }

  if (value instanceof Date) {
    const wrapper = new DateWrapper(new Date(value.getTime()), freeze);
    copies.set(value, wrapper);
    return wrapper;
  }
  if (value instanceof RegExp) {
    const { lastIndex }: { lastIndex: unknown } = value;

    // JS would allow to assign any value to lastIndex.
    // Assigning an object to it would mean the script could potentially mutate it
    // which would let the script mutate it and bleed into the host environment.
    // Let's be honest, that's a host problem not a sandbox one but let's prevent it anyway
    // e.g.
    //   Host:   `const r = new RegExp('a/g'); r.lastIndex = { foo: 1 };`
    //   Script: `r.lastIndex.foo = 2;` <- would mutate the host object
    if (typeof lastIndex !== 'number') {
      throw unsupported(
        `${path}.lastIndex`,
        typeof lastIndex === 'object' && lastIndex !== null ? describe(lastIndex) : typeof lastIndex
      );
    }

    const copy = new RegExp(value.source, value.flags);
    copy.lastIndex = lastIndex;
    const wrapper = new RegExpWrapper(copy, freeze);
    copies.set(value, wrapper);
    return wrapper;
  }
  if (value instanceof Map) {
    const wrapper = new MapWrapper(new Map(), freeze);
    copies.set(value, wrapper);
    for (const [key, entry] of value) {
      const keyPath = `${path}[${typeof key === 'string' ? JSON.stringify(key) : String(key)}]`;
      wrapper.map.set(
        convert(key, `${keyPath} (key)`, copies, settings, depth + 1),
        convert(entry, keyPath, copies, settings, depth + 1)
      );
    }
    return wrapper;
  }
  if (value instanceof Set) {
    const wrapper = new SetWrapper(new Set(), freeze);
    copies.set(value, wrapper);
    for (const [index, entry] of [...value].entries()) {
      wrapper.set.add(convert(entry, `${path}{${index}}`, copies, settings, depth + 1));
    }
    return wrapper;
  }

  throw unsupported(path, describe(value));
}

function unsupported(path: string, kind: string): TypeError {
  return new TypeError(`Unsupported value at ${path}: ${kind}`);
}

function describe(value: object): string {
  if (typeof value === 'function') {
    return 'function';
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (typeof prototype === 'object' && prototype !== null && 'constructor' in prototype) {
    const { constructor } = prototype;
    if (typeof constructor === 'function' && constructor.name !== '') {
      return constructor.name;
    }
  }
  return 'object';
}
