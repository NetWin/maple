import { describe, expect, it } from 'vitest';
import { Scope } from '../evaluator/scope.ts';
import { parse } from '../parse.ts';
import { defineOwn } from '../support/own-property.ts';
import { Closure } from '../values/closure.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import {
  DateWrapper,
  IteratorWrapper,
  MapWrapper,
  RegExpWrapper,
  SetWrapper
} from '../values/wrappers.ts';
import { fromHost } from './from-host.ts';
import { toHost, UnconvertibleValueError } from './to-host.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function at(value: unknown, ...path: Array<string>): unknown {
  let current = value;
  for (const key of path) {
    current = isRecord(current) ? current[key] : undefined;
  }
  return current;
}

function someClosure(): Closure {
  const [statement] = parse('(() => 1);').body;
  if (
    statement?.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'ArrowFunctionExpression'
  ) {
    throw new Error('expected an arrow function');
  }
  return new Closure(statement.expression, new Scope());
}

function firstEntry(map: ReadonlyMap<unknown, unknown>): [unknown, unknown] {
  const [first] = [...map];
  if (!first) {
    throw new Error('expected an entry');
  }
  return first;
}

describe('toHost', () => {
  it('passes primitives through', () => {
    expect(toHost(1)).toBe(1);
    expect(toHost('a')).toBe('a');
    expect(toHost(null)).toBe(null);
    expect(toHost(undefined)).toBe(undefined);
    expect(toHost(Number.NaN)).toBeNaN();
  });

  it('returns a fresh, unfrozen copy of objects and arrays', () => {
    const frozen = fromHost({ a: [1, { b: 2 }] });
    const copy = toHost(frozen);

    expect(copy).toEqual({ a: [1, { b: 2 }] });
    expect(copy).not.toBe(frozen);
    expect(at(copy, 'a')).not.toBe(at(frozen, 'a'));
    expect(Object.isFrozen(copy)).toBe(false);
    expect(Object.isFrozen(at(copy, 'a'))).toBe(false);
    expect(Object.isFrozen(at(copy, 'a', '1'))).toBe(false);
  });

  it('preserves cycles and shared references', () => {
    const shared = { x: 1 };
    const source: { self?: unknown; a: unknown; b: unknown } = { a: shared, b: shared };
    source.self = source;
    const copy = toHost(fromHost(source));

    expect(at(copy, 'self')).toBe(copy);
    expect(at(copy, 'a')).toBe(at(copy, 'b'));
  });

  it('preserves shared errors, Dates and RegExps', () => {
    const date = new DateWrapper(new Date(0), false);
    const regexp = new RegExpWrapper(/a/g, false);
    const error = new SandboxError('Error', 'x');
    const copy = toHost([date, date, regexp, regexp, error, error], true);

    expect(at(copy, '0')).toBe(at(copy, '1'));
    expect(at(copy, '2')).toBe(at(copy, '3'));
    expect(at(copy, '4')).toBe(at(copy, '5'));
    expect(at(copy, '0')).toBeInstanceOf(Date);
  });

  it('keeps holes and named properties of arrays', () => {
    const array: Array<unknown> = [];
    array[1] = 2;
    defineOwn(array, 'index', 1);
    defineOwn(array, '__proto__', { polluted: true });
    const copy = toHost(array);

    expect(Array.isArray(copy) && [copy.length, 0 in copy, copy[1]]).toEqual([2, false, 2]);
    expect(at(copy, 'index')).toBe(1);
    expect(isRecord(copy) && Object.hasOwn(copy, '__proto__')).toBe(false);
  });

  it('refuses cycles when strict, but not shared references', () => {
    const shared = { x: 1 };
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    expect(() => toHost(fromHost(cyclic), true)).toThrow(UnconvertibleValueError);
    const copy = toHost(fromHost({ a: shared, b: shared }), true);
    expect(at(copy, 'a')).toBe(at(copy, 'b'));
  });

  it('drops a __proto__ key, so host code cannot turn it into a prototype', () => {
    const source: unknown = JSON.parse('{"__proto__": {"polluted": true}, "kept": 1}');
    const copy = toHost(fromHost(source));

    expect(isRecord(copy) && Object.getOwnPropertyNames(copy)).toEqual(['kept']);
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.assign({}, copy)).toEqual({ kept: 1 });
    expect(toHost(fromHost(source), true)).toEqual({ kept: 1 });
    expect('polluted' in {}).toBe(false);
  });

  it('turns closures into undefined, also inside containers', () => {
    expect(toHost(someClosure())).toBeUndefined();
    expect(toHost([1, someClosure()])).toEqual([1, undefined]);
  });

  it('turns sandbox errors into plain objects with name and message', () => {
    expect(toHost(new SandboxError('TypeError', 'nope'))).toMatchObject({
      name: 'TypeError',
      message: 'nope',
      stack: 'TypeError: nope'
    });
  });

  it('unwraps Date, RegExp, Map and Set into fresh natives and drops iterators', () => {
    expect(toHost(new DateWrapper(new Date(5)))).toEqual(new Date(5));
    const regexp = new RegExp('a', 'g');
    regexp.lastIndex = 1;
    const out = toHost(new RegExpWrapper(regexp));
    expect(out).toEqual(/a/g);
    expect(out).not.toBe(regexp);
    expect(out instanceof RegExp && out.lastIndex).toBe(1);
    const shared = { n: 1 };
    const map = toHost(new MapWrapper(new Map([[shared, shared]])));
    expect(map).toBeInstanceOf(Map);
    const [key, value] = firstEntry(map instanceof Map ? map : new Map());
    expect(key).toEqual(shared);
    expect(key).not.toBe(shared);
    expect(key).toBe(value);
    expect(toHost(new SetWrapper(new Set([1])))).toEqual(new Set([1]));
    expect(toHost(new IteratorWrapper([1].values()))).toBeUndefined();
  });

  it('refuses values that cannot exist in the sandbox', () => {
    expect(() => toHost(new Date(0))).toThrow(Error);
  });
});
