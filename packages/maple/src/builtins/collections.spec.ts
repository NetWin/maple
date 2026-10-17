import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('Set', () => {
  it('constructs, deduplicates and iterates', () => {
    expect(
      run('const s = new Set([1, 2, 2, NaN, NaN]); return [s.size, s.has(2), s.has(NaN)];')
    ).toEqual([3, true, true]);
    expect(run('const s = new Set(); s.add(1).add(1); return s.size;')).toBe(1);
    expect(run('return [...new Set("aab")];')).toEqual(['a', 'b']);
    expect(run('return [...new Set([3, 1]).values()];')).toEqual([3, 1]);
    expect(run('return [...new Set([3]).entries()];')).toEqual([[3, 3]]);
    expect(
      run(
        'const out = []; new Set([1]).forEach((v, k, s) => out.push(v, k, s instanceof Set)); return out;'
      )
    ).toEqual([1, 1, true]);
    expect(run('const s = new Set([1]); return [s.delete(1), s.has(1)];')).toEqual([true, false]);
    expect(run('return [...new Set([1, 2])].map((x) => x * 2);')).toEqual([2, 4]);
    expect(run('return new Set([new Set()]).size;')).toBe(1);
    expect(runAndCatch(maple, 'Set();').sandboxError?.name).toBe('TypeError');
  });

  it('is read-only from the input and crosses the boundary as a native Set', () => {
    const data = { tags: new Set(['a']) };

    expect(run('return tags.has("a");', data)).toBe(true);
    expect(runAndCatch(maple, 'tags.add("b");', data).sandboxError?.message).toBe(
      'Cannot call add on a read-only Set'
    );
    expect(run('return new Set(tags).add("b").size;', data)).toBe(2);
    expect(run('return new Set([1]);')).toEqual(new Set([1]));
    expect(run('return new Set() + "";')).toBe('[object Set]');
  });
});

describe('Set algebra', () => {
  it('combines two sets into a new mutable Set', () => {
    const setup = 'const a = new Set([1, 2, 3]); const b = new Set([3, 4]);';

    expect(run(`${setup} return [...a.union(b)];`)).toEqual([1, 2, 3, 4]);
    expect(run(`${setup} return [...a.intersection(b)];`)).toEqual([3]);
    expect(run(`${setup} return [...a.difference(b)];`)).toEqual([1, 2]);
    expect(run(`${setup} return [...a.symmetricDifference(b)];`)).toEqual([1, 2, 4]);
    expect(
      run(`${setup} const u = a.union(b); u.add(9); return [u.size, a.size, u === a];`)
    ).toEqual([5, 3, false]);
    expect(run(`${setup} return a.union(b) instanceof Set;`)).toBe(true);
  });

  it('answers the subset relations', () => {
    expect(run('return new Set([1]).isSubsetOf(new Set([1, 2]));')).toBe(true);
    expect(run('return new Set([1, 2]).isSupersetOf(new Set([2]));')).toBe(true);
    expect(run('return new Set([1]).isDisjointFrom(new Set([2]));')).toBe(true);
    expect(run('return new Set([1]).isDisjointFrom(new Set([1]));')).toBe(false);
  });

  it('accepts a Map by its keys and works on read-only input', () => {
    expect(run('return [...new Set([1, 2]).intersection(new Map([[2, "x"]]))];')).toEqual([2]);
    expect(run('return [...tags.union(new Set(["b"]))];', { tags: new Set(['a']) })).toEqual([
      'a',
      'b'
    ]);
    expect(run('return new Set([1]).union(new Set([2]));')).toEqual(new Set([1, 2]));
  });

  it('refuses set-likes that are not collections, so no script member is called', () => {
    const fake = 'const fake = { size: 1, has: () => true, keys: () => [].values() };';

    expect(runAndCatch(maple, `${fake} new Set([1]).union(fake);`).sandboxError).toMatchObject({
      name: 'TypeError',
      message: 'Set.prototype.union expects a Set or a Map'
    });
    expect(runAndCatch(maple, 'new Set().isSubsetOf([1]);').sandboxError?.name).toBe('TypeError');
    expect(runAndCatch(maple, 'new Set().difference();').sandboxError?.name).toBe('TypeError');
  });
});

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
    expect(run('return "next" in [].values();')).toBe(false);
    expect(run('return [].values() + "";')).toBe('[object Iterator]');
    expect(run('return JSON.stringify([].values());')).toBe('{}');
    expect(run('return [].values() instanceof Object;')).toBe(true);
    expect(runAndCatch(maple, '[].values().x = 1;').sandboxError?.name).toBe('TypeError');
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
