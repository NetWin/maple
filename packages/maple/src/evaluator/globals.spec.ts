import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

/** Assigns to a property of the data and returns the new value, or the name of the error. */
function assignInData(options: object): unknown {
  return new Maple().run(
    'try { obj.a = 2; return obj.a; } catch (e) { return e.name; }',
    { obj: { a: 1 } },
    options
  ).value;
}

describe('globals', () => {
  it('exposes each top-level data key as a binding', () => {
    expect(new Maple().run('return name;', { name: 'maple' }).value).toBe('maple');
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

  it('lets the script change data and run globals with freeze: false', () => {
    const data = { list: [1], obj: { a: 1, b: 2 }, when: new Date(0), lookup: new Map([['k', 1]]) };
    const { value } = new Maple().run(
      `
        list.push(2);
        obj.a = 3;
        delete obj.b;
        when.setTime(5);
        lookup.set("x", 2);
        run.n++;
        return [list, obj, when.getTime(), lookup.size, run.n];
      `,
      data,
      { freeze: false, globals: { run: { n: 1 } } }
    );

    expect(value).toEqual([[1, 2], { a: 3 }, 5, 2, 2]);
  });

  it('lets the script reassign data and run globals with freeze: false', () => {
    const { value } = new Maple().run(
      'item = item.inner; count += 1; return [item, count];',
      { item: { inner: 'value' } },
      { freeze: false, globals: { count: 1 } }
    );

    expect(value).toEqual(['value', 2]);
  });

  it('keeps data frozen unless freeze is exactly false', () => {
    expect(assignInData({})).toBe('TypeError');
    expect(assignInData({ freeze: true })).toBe('TypeError');
    expect(assignInData({ freeze: 0 })).toBe('TypeError');
    expect(assignInData({ freeze: false })).toBe(2);
  });

  it('can be shadowed by a declaration in the script', () => {
    const maple = new Maple();

    expect(maple.run('let name = "local"; return name;', { name: 'maple' }).value).toBe('local');
    expect(maple.run('var name = "local"; return name;', { name: 'maple' }).value).toBe('local');
    expect(maple.run('const undefined = 1; return undefined;').value).toBe(1);
  });

  it('treats a key named __proto__ as a plain binding', () => {
    // A computed key makes `__proto__` an own property instead of setting the prototype
    const { value } = new Maple().run('return __proto__;', { ['__proto__']: 1 });

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
