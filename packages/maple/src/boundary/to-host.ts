import { isPlainObject } from '../support/is-plain-object.ts';
import { MAX_NESTING } from '../support/nesting-limit.ts';
import { defineOwn } from '../support/own-property.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure } from '../values/closure.ts';
import { NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import {
  DateWrapper,
  IteratorWrapper,
  MapWrapper,
  RegExpWrapper,
  SetWrapper
} from '../values/wrappers.ts';

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
  return convert(value, { copies: new Map(), open: new Set(), strict }, 0);
}

interface Walk {
  /** Every container copied so far, so a value reached twice is copied once. */
  readonly copies: Map<object, unknown>;
  /** The containers whose copy is still being filled; reaching one of them again is a cycle. */
  readonly open: Set<object>;
  readonly strict: boolean;
}

function convert(value: unknown, walk: Walk, depth: number): unknown {
  if (depth > MAX_NESTING) {
    throw new RangeError(
      `A value nested deeper than ${MAX_NESTING} levels cannot leave the sandbox`
    );
  }
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

  if (walk.strict && walk.open.has(value)) {
    throw new UnconvertibleValueError('cyclic value');
  }
  if (walk.copies.has(value)) {
    return walk.copies.get(value);
  }
  // Errors, Dates and RegExps hold no sandbox values but are cached all the same, so a value
  // reached twice is still one value outside
  const leaf = copyLeaf(value);
  if (leaf !== undefined) {
    walk.copies.set(value, leaf);
    return leaf;
  }
  walk.open.add(value);
  const copy = copyContainer(value, walk, depth);
  walk.open.delete(value);
  return copy;
}

function copyLeaf(value: object): object | undefined {
  if (value instanceof SandboxError) {
    return value.toInfo();
  }
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
      // Host code that copies by assignment would turn an own __proto__ key into a prototype
      if (key !== '__proto__') {
        defineOwn(copy, key, convert(value[key], walk, depth + 1));
      }
    }
    return copy;
  }

  throw new Error('A value of an unknown kind reached the output boundary');
}
