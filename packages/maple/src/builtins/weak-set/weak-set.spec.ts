import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string): unknown {
  return maple.run(code).value;
}

function errorOf(code: string): unknown {
  const error = runAndCatch(maple, code).sandboxError;
  return [error?.name, error?.message];
}

describe('WeakSet', () => {
  it('holds objects by identity', () => {
    expect(run('const k = {}; const ws = new WeakSet(); ws.add(k); return ws.has(k);')).toBe(true);
    expect(run('const ws = new WeakSet(); ws.add({}); return ws.has({});')).toBe(false);
    expect(run('const ws = new WeakSet(); return ws.add({}) === ws;')).toBe(true);
    expect(
      run('const k = {}; const ws = new WeakSet([k]); return [ws.delete(k), ws.has(k)];')
    ).toEqual([true, false]);
    expect(run('return new WeakSet().delete({});')).toBe(false);
  });

  it('takes any object, functions and built-ins included', () => {
    expect(run('const f = () => 1; return new WeakSet([f]).has(f);')).toBe(true);
    expect(run('return new WeakSet([Math, JSON]).has(JSON);')).toBe(true);
    expect(run('const ws = new WeakSet(); ws.add(ws); return ws.has(ws);')).toBe(true);
  });

  it('refuses primitives when adding them', () => {
    expect(errorOf('new WeakSet().add("a");')).toEqual([
      'TypeError',
      'Invalid value used in weak set'
    ]);
    expect(errorOf('new WeakSet([{}, 1]);')).toEqual([
      'TypeError',
      'Invalid value used in weak set'
    ]);
  });

  it('looks primitives up without throwing', () => {
    expect(run('return new WeakSet().has("a");')).toBe(false);
    expect(run('return new WeakSet().delete(null);')).toBe(false);
  });

  it('constructs from an iterable', () => {
    expect(run('const a = {}; return new WeakSet(new Set([a])).has(a);')).toBe(true);
    expect(run('return new WeakSet(undefined).has({});')).toBe(false);
    expect(errorOf('new WeakSet(5);')).toEqual(['TypeError', '5 is not iterable']);
  });

  it('requires new and reports its type', () => {
    expect(errorOf('WeakSet();')).toEqual(['TypeError', "Constructor WeakSet requires 'new'"]);
    expect(run('return new WeakSet() instanceof WeakSet;')).toBe(true);
    expect(run('return new Set() instanceof WeakSet;')).toBe(false);
    expect(run('return String(new WeakSet());')).toBe('[object WeakSet]');
    expect(run('return [WeakSet.length, new WeakSet().add.length];')).toEqual([0, 1]);
  });

  it('is no set-like for the set algebra and is not iterable', () => {
    expect(errorOf('new Set().isSubsetOf(new WeakSet());')).toEqual([
      'TypeError',
      'Set.prototype.isSubsetOf expects a Set or a Map'
    ]);
    expect(runAndCatch(maple, '[...new WeakSet()];').sandboxError?.name).toBe('TypeError');
  });

  it('leaves the run as undefined', () => {
    expect(run('return [new WeakSet()];')).toStrictEqual([undefined]);
  });
});
