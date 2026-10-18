import { isPlainObject } from '../support/is-plain-object.ts';
import { MAX_NESTING } from '../support/nesting-limit.ts';
import { defineOwn } from '../support/own-property.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure } from '../values/closure.ts';
import { NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import { DateWrapper } from '../values/wrappers/date-wrapper.ts';
import { IteratorWrapper } from '../values/wrappers/iterator-wrapper.ts';
import { MapWrapper } from '../values/wrappers/map-wrapper.ts';
import { RegExpWrapper } from '../values/wrappers/regexp-wrapper.ts';
import { SetWrapper } from '../values/wrappers/set-wrapper.ts';
import type { SandboxErrorInfo } from './maple-error.ts';

/**
 * What the copy of an uncaught error's properties may cost: one per value plus each string's
 * length.
 */
export const MAX_ERROR_PROPERTIES_SIZE = 65_536;

type UnconvertibleKind = 'function' | 'iterator' | 'cyclic value';

/** Thrown by a strict `toHost` for a value that must not leave the sandbox. */
export class UnconvertibleValueError extends Error {
  public readonly kind: UnconvertibleKind;

  constructor(kind: UnconvertibleKind) {
    super(`A ${kind} cannot leave the sandbox`);
    this.kind = kind;
  }
}

/**
 * Copies a sandbox value out for the host: a fresh, mutable structure that shares nothing with
 * the run and contains nothing executable. Functions and iterators become `undefined` and cycles
 * are preserved, or, when `strict` as for host function arguments, both throw an
 * `UnconvertibleValueError`. Throws a plain error for a value the sandbox could not have produced.
 */
export function toHost(value: unknown, strict: boolean = false): unknown {
  return convert(value, { copies: new Map(), open: new Set(), strict, acyclic: false }, 0);
}

/**
 * An uncaught error as the host receives it: `name`, `message`, `stack` and what the script added.
 * Host error handling serializes and logs it, so the copy is a tree within
 * `MAX_ERROR_PROPERTIES_SIZE`: a cycle or a copy over the budget throws a `RangeError`.
 */
export function toHostError(error: SandboxError): SandboxErrorInfo {
  const walk: Walk = {
    copies: new Map(),
    open: new Set(),
    strict: false,
    acyclic: true,
    budget: { remaining: MAX_ERROR_PROPERTIES_SIZE }
  };
  return copyError(error, walk, 0);
}

interface Walk {
  /** Every container copied so far, so a value reached twice is copied once. */
  readonly copies: Map<object, unknown>;
  /** The containers whose copy is still being filled; reaching one of them again is a cycle. */
  readonly open: Set<object>;
  readonly strict: boolean;
  /**
   * Refuses cycles, and copies a value reached twice once per reference, so the budget also
   * covers what serializing the copy expands to.
   */
  readonly acyclic: boolean;
  readonly budget?: { remaining: number };
}

function charge(walk: Walk, amount: number): void {
  if (walk.budget === undefined) {
    return;
  }
  walk.budget.remaining -= amount;
  if (walk.budget.remaining < 0) {
    throw new RangeError(
      `An error's properties larger than ${MAX_ERROR_PROPERTIES_SIZE} cannot leave the sandbox`
    );
  }
}

function convert(value: unknown, walk: Walk, depth: number): unknown {
  if (depth > MAX_NESTING) {
    throw new RangeError(
      `A value nested deeper than ${MAX_NESTING} levels cannot leave the sandbox`
    );
  }
  charge(walk, typeof value === 'string' ? 1 + value.length : 1);
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' ? undefined : value;
  }
  if (value instanceof Closure || value instanceof Builtin || value instanceof NativeFunction) {
    if (walk.strict) {
      throw new UnconvertibleValueError('function');
    }
    return undefined;
  }
  if (value instanceof IteratorWrapper) {
    if (walk.strict) {
      throw new UnconvertibleValueError('iterator');
    }
    return undefined;
  }

  if (walk.open.has(value)) {
    if (walk.strict) {
      throw new UnconvertibleValueError('cyclic value');
    }
    if (walk.acyclic) {
      throw new RangeError('A cyclic error cannot leave the sandbox');
    }
  }
  if (!walk.acyclic && walk.copies.has(value)) {
    return walk.copies.get(value);
  }
  // Dates and RegExps hold no sandbox values but are cached all the same,
  // so a value reached twice is still one value outside
  const leaf = copyLeaf(value);
  if (leaf !== undefined) {
    charge(walk, leaf instanceof RegExp ? leaf.source.length : 0);
    walk.copies.set(value, leaf);
    return leaf;
  }
  walk.open.add(value);
  const copy = copyContainer(value, walk, depth);
  walk.open.delete(value);
  return copy;
}

function copyLeaf(value: object): object | undefined {
  if (value instanceof DateWrapper) {
    return new Date(value.date.getTime());
  }
  if (value instanceof RegExpWrapper) {
    const copy = new RegExp(value.regexp.source, value.regexp.flags);
    copy.lastIndex = value.regexp.lastIndex;
    return copy;
  }
  return undefined;
}

function copyContainer(value: object, walk: Walk, depth: number): unknown {
  if (value instanceof SandboxError) {
    return copyError(value, walk, depth);
  }

  if (value instanceof MapWrapper) {
    const copy = new Map<unknown, unknown>();
    walk.copies.set(value, copy);
    for (const [key, entry] of value.map) {
      copy.set(convert(key, walk, depth + 1), convert(entry, walk, depth + 1));
    }
    return copy;
  }

  if (value instanceof SetWrapper) {
    const copy = new Set<unknown>();
    walk.copies.set(value, copy);
    for (const entry of value.set) {
      copy.add(convert(entry, walk, depth + 1));
    }
    return copy;
  }

  if (Array.isArray(value)) {
    // Own keys rather than the iterator keep holes as holes, and a match result carries `index`,
    // `input` and `groups` next to its elements
    const copy: Array<unknown> = [];
    copy.length = value.length;
    walk.copies.set(value, copy);
    for (const key of Object.keys(value)) {
      charge(walk, key.length);
      if (key !== '__proto__') {
        defineOwn(copy, key, convert(Reflect.get(value, key), walk, depth + 1));
      }
    }
    return copy;
  }

  if (isPlainObject(value)) {
    const copy: Record<string, unknown> = {};
    walk.copies.set(value, copy);
    for (const key of Object.keys(value)) {
      charge(walk, key.length);
      // Host code that copies by assignment would turn an own __proto__ key into a prototype
      if (key !== '__proto__') {
        defineOwn(copy, key, convert(value[key], walk, depth + 1));
      }
    }
    return copy;
  }

  throw new Error('A value of an unknown kind reached the output boundary');
}

/**
 * `properties` is there only when the script added any, so an error without them keeps the shape it
 * always had. A wrapper's added properties stay behind: a Date or a Map leaves as the host's own.
 */
function copyError(error: SandboxError, walk: Walk, depth: number): SandboxErrorInfo {
  const copy: SandboxErrorInfo = error.toInfo();
  walk.copies.set(error, copy);

  const keys = error.properties.enumerableKeys();
  if (keys.length === 0) {
    return copy;
  }

  const properties: Record<string, unknown> = {};
  copy.properties = properties;
  walk.open.add(error);

  for (const key of keys) {
    charge(walk, key.length);
    // Host code that copies by assignment would turn an own __proto__ key into a prototype
    if (key !== '__proto__') {
      defineOwn(properties, key, convert(error.properties.getAdded(key)?.value, walk, depth + 1));
    }
  }

  walk.open.delete(error);
  return copy;
}
