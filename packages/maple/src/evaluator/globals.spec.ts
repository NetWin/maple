import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

describe('globals', () => {
  it('exposes each top-level data key as a binding', () => {
    expect(new Maple().run('return name;', { name: 'maple' }).value).toBe('maple');
    expect(new Maple().run('return name;', '{"name":"maple"}').value).toBe('maple');
  });

  it('exposes instance and run globals', () => {
    const maple = new Maple({ globals: { fromInstance: 1 } });

    expect(maple.run('return fromInstance;').value).toBe(1);
    expect(maple.run('return fromRun;', undefined, { globals: { fromRun: 2 } }).value).toBe(2);
  });

  it('lets data shadow run globals and run globals shadow instance globals', () => {
    const maple = new Maple({ globals: { a: 'instance', b: 'instance', c: 'instance' } });
    const { value } = maple.run('return a;', { a: 'data' }, { globals: { a: 'run', b: 'run' } });

    expect(value).toBe('data');
    expect(maple.run('return b;', {}, { globals: { b: 'run' } }).value).toBe('run');
    expect(maple.run('return c;', {}, { globals: { b: 'run' } }).value).toBe('instance');
  });

  it('provides undefined, NaN and Infinity', () => {
    const maple = new Maple();

    expect(maple.run('return undefined;').value).toBeUndefined();
    expect(maple.run('return NaN;').value).toBeNaN();
    expect(maple.run('return Infinity;').value).toBe(Number.POSITIVE_INFINITY);
  });

  it('is read-only', () => {
    const error = runAndCatch(new Maple(), 'name = "x";', { name: 'maple' });

    expect(error.code).toBe('RUNTIME_ERROR');
    expect(error.sandboxError).toMatchObject({
      name: 'TypeError',
      message: "Cannot assign to read-only global 'name'"
    });
    expect(runAndCatch(new Maple(), 'undefined = 1;').sandboxError?.name).toBe('TypeError');
  });

  it('can be shadowed by a declaration in the script', () => {
    const maple = new Maple();

    expect(maple.run('let name = "local"; return name;', { name: 'maple' }).value).toBe('local');
    expect(maple.run('var name = "local"; return name;', { name: 'maple' }).value).toBe('local');
    expect(maple.run('const undefined = 1; return undefined;').value).toBe(1);
  });

  it('treats a key named __proto__ as a plain binding', () => {
    const { value } = new Maple().run('return __proto__;', '{"__proto__": 1}');

    expect(value).toBe(1);
  });

  it('lets a global shadow a host-only name', () => {
    expect(new Maple().run('return Promise;', { Promise: 'mine' }).value).toBe('mine');
  });

  it('never hands the host object back, in either direction', () => {
    const data = { list: [1, 2] };
    const { value } = new Maple().run('return list;', data);

    expect(value).toEqual([1, 2]);
    expect(value).not.toBe(data.list);
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(data.list)).toBe(false);
  });

  it('rejects unsupported values in globals with a plain TypeError before the run', () => {
    expect(() => new Maple({ globals: { bad: Symbol('x') } })).toThrow(
      new TypeError('Unsupported value at globals.bad: symbol')
    );
    expect(() => new Maple().run('return 1;', { bad: new Uint8Array() })).toThrow(
      new TypeError('Unsupported value at data.bad: Uint8Array')
    );
    expect(() => new Maple().run('return 1;', {}, { globals: { bad: Symbol('x') } })).toThrow(
      new TypeError('Unsupported value at options.globals.bad: symbol')
    );
  });
});
