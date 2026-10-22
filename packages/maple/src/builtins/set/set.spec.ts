import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: object): unknown {
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
    expect(
      run('try { new Set(Object.groupBy([], (x) => x)); } catch (e) { return e.message; }')
    ).toBe('[object Object] is not iterable');
  });

  it('forEach calls its callback with the thisArg as this', () => {
    expect(
      run(
        'const seen = []; new Set([1]).forEach(function () { seen.push(this); }, 5); return seen;'
      )
    ).toEqual([5]);
    expect(
      run('const seen = []; new Set([1]).forEach(function () { seen.push(this); }); return seen;')
    ).toEqual([undefined]);
    expect(
      run(
        'const o = { f() { let s; new Set([1]).forEach(() => { s = this; }, 5); return s === o; } }; return o.f();'
      )
    ).toBe(true);
    expect(run('return new Set().forEach.length;')).toBe(1);
  });

  it('is read-only from frozen input and crosses the boundary as a native Set', () => {
    const data = { tags: new Set(['a']) };

    expect(run('return tags.has("a");', data)).toBe(true);
    expect(runAndCatch(maple, 'tags.add("b");', data, { freeze: true }).sandboxError?.message).toBe(
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
