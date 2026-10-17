import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('iterators', () => {
  it('follow the protocol and are consumed once', () => {
    expect(run('const it = [1, 2].values(); return [it.next(), it.next(), it.next()];')).toEqual([
      { value: 1, done: false },
      { value: 2, done: false },
      { value: undefined, done: true }
    ]);
    expect(run('return [...[7, 8].keys()];')).toEqual([0, 1]);
    expect(run('return [...["a"].entries()];')).toEqual([[0, 'a']]);
    expect(run('const it = [1, 2, 3].values(); it.next(); return [...it];')).toEqual([2, 3]);
    expect(run('const it = [1].values(); [...it]; return [...it];')).toEqual([]);
    expect(run('let s = 0; for (const n of new Set([1, 2]).values()) { s += n; } return s;')).toBe(
      3
    );
    expect(run('const [a, b] = new Map([[1, 2]]).entries().next().value; return a + b;')).toBe(3);
  });

  it('are plain sandbox objects with nothing but next', () => {
    expect(run('return typeof [].values();')).toBe('object');
    expect(run('return typeof [].values().next;')).toBe('function');
    expect(run('return [].values().foo;')).toBeUndefined();
    expect(run('return "next" in [].values();')).toBe(true);
    expect(run('return [].values() + "";')).toBe('[object Iterator]');
    expect(run('return JSON.stringify([].values());')).toBe('{}');
    expect(run('return [].values() instanceof Object;')).toBe(true);
    expect(run('const i = [1].values(); i.x = 1; return [i.x, i.next().value];')).toEqual([1, 1]);
  });

  it('never leave the sandbox', () => {
    expect(run('return [1].values();')).toBeUndefined();
    expect(run('return { it: [1].keys() };')).toEqual({ it: undefined });
  });
});

describe('iterator helpers', () => {
  it('map, filter, take and drop lazily', () => {
    expect(
      run('return [1, 2, 3, 4].values().map((x) => x * 2).filter((x) => x > 2).toArray();')
    ).toEqual([4, 6, 8]);
    expect(run('return new Set([1, 2, 3]).values().drop(1).take(1).toArray();')).toEqual([2]);
    expect(
      run(
        'let calls = 0; const it = [1, 2, 3].values().map((x) => { calls++; return x; }); it.next(); return calls;'
      )
    ).toBe(1);
    expect(run('return [1, 2].values().map((x, i) => i).toArray();')).toEqual([0, 1]);
    expect(run('return [..."ab".matchAll(/./g).map((m) => m[0].toUpperCase())];')).toEqual([
      'A',
      'B'
    ]);
  });

  it('flatMap iterables but not strings', () => {
    expect(run('return [1, 2].values().flatMap((x) => [x, x]).toArray();')).toEqual([1, 1, 2, 2]);
    expect(run('return [1].values().flatMap(() => new Set(["a"])).toArray();')).toEqual(['a']);
    expect(
      run('try { [1].values().flatMap(() => "ab").toArray(); } catch (e) { return e.message; }')
    ).toBe('ab is not an iterable object');
  });

  it('reduce, some, every, find and forEach eagerly', () => {
    expect(run('return [1, 2, 3].values().reduce((a, b) => a + b);')).toBe(6);
    expect(run('return [1, 2].values().reduce((a, b, i) => a + i, 10);')).toBe(11);
    expect(
      run('try { [].values().reduce((a, b) => a); } catch (e) { return [e.name, e.message]; }')
    ).toEqual(['TypeError', 'Reduce of empty iterator with no initial value']);
    expect(
      run('return [[1, 2].values().some((x) => x > 1), [1, 2].values().every((x) => x > 1)];')
    ).toEqual([true, false]);
    expect(run('return new Map([["a", 1], ["b", 2]]).entries().find(([k, v]) => v > 1);')).toEqual([
      'b',
      2
    ]);
    expect(run('let s = 0; [1, 2].values().forEach((x) => { s += x; }); return s;')).toBe(3);
  });

  it('validate their arguments and run callbacks under the budget', () => {
    expect(run('try { [1].values().map(5); } catch (e) { return e.message; }')).toBe(
      '5 is not a function'
    );
    expect(run('try { [1].values().take(-1); } catch (e) { return e.name; }')).toBe('RangeError');
    expect(
      runAndCatch(
        new Maple({ maxOps: 300 }),
        '[1].values().map(() => { while (true) {} }).toArray();'
      ).code
    ).toBe('LIMIT_EXCEEDED');
  });

  it('build iterators with Iterator.from', () => {
    expect(run('return Iterator.from([1, 2]).map((x) => x + 1).toArray();')).toEqual([2, 3]);
    expect(run('return Iterator.from("ab").toArray();')).toEqual(['a', 'b']);
    expect(run('const it = [1].values(); return Iterator.from(it) === it;')).toBe(true);
    expect(
      run('return [[].values() instanceof Iterator, typeof Iterator, [] instanceof Iterator];')
    ).toEqual([true, 'function', false]);
    expect(
      runAndCatch(maple, 'Iterator.from({ next: () => ({ done: true }) });').sandboxError?.message
    ).toBe('[object Object] is not iterable');
    expect(runAndCatch(maple, 'Iterator();').sandboxError?.name).toBe('TypeError');
    expect(runAndCatch(maple, 'new Iterator();').code).toBe('DISALLOWED_SYNTAX');
  });
});
