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

describe('WeakMap', () => {
  it('stores values under object keys by identity', () => {
    expect(run('const k = {}; const wm = new WeakMap(); wm.set(k, 1); return wm.get(k);')).toBe(1);
    expect(run('const wm = new WeakMap(); wm.set({}, 1); return wm.get({});')).toBeUndefined();
    expect(run('const k = []; return new WeakMap().set(k, 1).set(k, 2).get(k);')).toBe(2);
    expect(run('const wm = new WeakMap(); return wm.set({}, 1) === wm;')).toBe(true);
  });

  it('answers has and delete', () => {
    expect(run('const k = {}; const wm = new WeakMap([[k, 1]]); return wm.has(k);')).toBe(true);
    expect(run('return new WeakMap().has({});')).toBe(false);
    expect(
      run('const k = {}; const wm = new WeakMap([[k, 1]]); return [wm.delete(k), wm.has(k)];')
    ).toEqual([true, false]);
    expect(run('return new WeakMap().delete({});')).toBe(false);
  });

  it('takes any object as a key, functions and built-ins included', () => {
    expect(run('const f = () => 1; return new WeakMap([[f, "f"]]).get(f);')).toBe('f');
    expect(run('return new WeakMap([[Math, "m"]]).get(Math);')).toBe('m');
    expect(run('const m = new Map(); return new WeakMap([[m, 1]]).has(m);')).toBe(true);
    expect(run('const wm = new WeakMap(); wm.set(wm, 1); return wm.get(wm);')).toBe(1);
  });

  it('refuses primitive keys when storing them', () => {
    expect(errorOf('new WeakMap().set(1, 2);')).toEqual([
      'TypeError',
      'Invalid value used as weak map key'
    ]);
    expect(errorOf('new WeakMap().set(null, 2);')).toEqual([
      'TypeError',
      'Invalid value used as weak map key'
    ]);
    expect(errorOf('new WeakMap([["a", 1]]);')).toEqual([
      'TypeError',
      'Invalid value used as weak map key'
    ]);
  });

  it('looks primitive keys up without throwing', () => {
    expect(run('return new WeakMap().get("a");')).toBeUndefined();
    expect(run('return new WeakMap().has(1);')).toBe(false);
    expect(run('return new WeakMap().delete(undefined);')).toBe(false);
  });

  it('constructs from an iterable of entries', () => {
    expect(run('const a = {}; const b = {}; return new WeakMap([[a, 1], [b, 2]]).get(b);')).toBe(2);
    expect(run('return new WeakMap(null).has({});')).toBe(false);
    expect(errorOf('new WeakMap(5);')).toEqual(['TypeError', '5 is not iterable']);
    expect(errorOf('new WeakMap([1]);')).toEqual([
      'TypeError',
      'Iterator value 1 is not an entry object'
    ]);
  });

  it('requires new and reports its type', () => {
    expect(errorOf('WeakMap();')).toEqual(['TypeError', "Constructor WeakMap requires 'new'"]);
    expect(run('return new WeakMap() instanceof WeakMap;')).toBe(true);
    expect(run('return new Map() instanceof WeakMap;')).toBe(false);
    expect(run('return typeof new WeakMap();')).toBe('object');
    expect(run('return String(new WeakMap());')).toBe('[object WeakMap]');
    expect(
      run('return [WeakMap.length, new WeakMap().set.length, new WeakMap().get.length];')
    ).toEqual([0, 2, 1]);
  });

  it('keeps properties a script adds, and lists no entries', () => {
    expect(run('const wm = new WeakMap(); wm.label = "x"; return wm.label;')).toBe('x');
    expect(run('return Object.keys(new WeakMap([[{}, 1]]));')).toEqual([]);
    expect(run('return JSON.stringify(new WeakMap([[{}, 1]]));')).toBe('{}');
    expect(runAndCatch(maple, '[...new WeakMap()];').sandboxError?.name).toBe('TypeError');
  });

  it('leaves the run as undefined', () => {
    expect(run('return new WeakMap();')).toBeUndefined();
    expect(run('return { cache: new WeakMap(), n: 1 };')).toStrictEqual({
      cache: undefined,
      n: 1
    });
  });
});
