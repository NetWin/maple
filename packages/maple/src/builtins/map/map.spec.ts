import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: object): unknown {
  return maple.run(code, data).value;
}

describe('Map', () => {
  it('constructs, stores by identity and reports size', () => {
    expect(
      run(
        'const m = new Map(); m.set("a", 1).set("b", 2); return [m.size, m.get("a"), m.has("b"), m.get("z")];'
      )
    ).toEqual([2, 1, true, undefined]);
    expect(run('return new Map([["a", 1], ["b", 2]]).get("b");')).toBe(2);
    expect(run('const k = {}; const m = new Map([[k, 1]]); return [m.get(k), m.get({})];')).toEqual(
      [1, undefined]
    );
    expect(run('const m = new Map([[NaN, "n"]]); return m.get(NaN);')).toBe('n');
    expect(
      run('const m = new Map([[1, "a"]]); return [m.delete(1), m.delete(1), m.size];')
    ).toEqual([true, false, 0]);
    expect(run('const m = new Map([[1, 1]]); m.clear(); return m.size;')).toBe(0);
    expect(run('return new Map() instanceof Map && new Map() instanceof Object;')).toBe(true);
    expect(run('return typeof new Map();')).toBe('object');
    expect(run('try { new Map([1]); } catch (e) { return e.name; }')).toBe('TypeError');
    expect(run('try { new Map(5); } catch (e) { return e.message; }')).toBe('5 is not iterable');
    expect(runAndCatch(maple, 'Map();').sandboxError?.message).toBe(
      "Constructor Map requires 'new'"
    );
  });

  it('iterates in insertion order through every protocol', () => {
    const setup = 'const m = new Map([["b", 2], ["a", 1]]);';

    expect(run(`${setup} return [...m];`)).toEqual([
      ['b', 2],
      ['a', 1]
    ]);
    expect(run(`${setup} return [...m.keys()];`)).toEqual(['b', 'a']);
    expect(run(`${setup} return [...m.values()];`)).toEqual([2, 1]);
    expect(run(`${setup} return [...m.entries()][1];`)).toEqual(['a', 1]);
    expect(run(`${setup} let s = ""; for (const [k, v] of m) { s += k + v; } return s;`)).toBe(
      'b2a1'
    );
    expect(
      run(
        `${setup} const out = []; m.forEach((v, k, map) => out.push(k, v, map === m)); return out;`
      )
    ).toEqual(['b', 2, true, 'a', 1, true]);
    expect(run(`${setup} return Object.fromEntries(m);`)).toEqual({ b: 2, a: 1 });
    expect(run(`${setup} return Array.from(m.keys());`)).toEqual(['b', 'a']);
    expect(run(`${setup} const [[k]] = m; return k;`)).toBe('b');
  });

  it('forEach calls its callback with the thisArg as this', () => {
    expect(
      run(
        'const seen = []; new Map([[1, 2]]).forEach(function () { seen.push(this); }, 5); return seen;'
      )
    ).toEqual([5]);
    expect(
      run(
        'const seen = []; new Map([[1, 2]]).forEach(function () { seen.push(this); }); return seen;'
      )
    ).toEqual([undefined]);
    expect(
      run(
        'const o = { f() { let s; new Map([[1, 2]]).forEach(() => { s = this; }, 5); return s === o; } }; return o.f();'
      )
    ).toBe(true);
    expect(run('return new Map().forEach.length;')).toBe(1);
  });

  it('has no own properties besides size but takes the ones a script adds', () => {
    expect(run('return ["size" in new Map(), "get" in new Map()];')).toEqual([true, true]);
    expect(run('return new Map().foo;')).toBeUndefined();
    expect(run('return Object.keys(new Map([[1, 2]]));')).toEqual([]);
    expect(
      run(
        'const m = new Map(); m.meta = 1; return [m.meta, "meta" in m, Object.keys(m), JSON.stringify(m)];'
      )
    ).toEqual([1, true, ['meta'], '{"meta":1}']);
    expect(
      run('const s = new Set([1]); s.meta = 1; delete s.meta; return [s.meta, s.size];')
    ).toEqual([undefined, 1]);
    expect(runAndCatch(maple, 'new Map().size = 1;').sandboxError?.message).toBe(
      "Cannot assign to read-only property 'size' of a Map"
    );
    expect(run('return new Map() + "";')).toBe('[object Map]');
    expect(run('return JSON.stringify(new Map([[1, 2]]));')).toBe('{}');
  });

  it('crosses the boundary as a native Map and is read-only from frozen input', () => {
    const data = { lookup: new Map([['a', { n: 1 }]]) };

    expect(run('return lookup.get("a").n;', data)).toBe(1);
    expect(run('return lookup.size;', data)).toBe(1);
    expect(
      runAndCatch(maple, 'lookup.set("b", 2);', data, { freeze: true }).sandboxError?.message
    ).toBe('Cannot call set on a read-only Map');
    expect(
      runAndCatch(maple, 'lookup.get("a").n = 2;', data, { freeze: true }).sandboxError?.name
    ).toBe('TypeError');
    expect(run('return new Map(lookup).set("b", 2).size;', data)).toBe(2);
    const out = run('return new Map([["k", [1]]]);');
    expect(out).toBeInstanceOf(Map);
    expect(out).toEqual(new Map([['k', [1]]]));
    expect(run('return [new Map()];')).toEqual([new Map()]);
  });
});

describe('Map.groupBy', () => {
  it('groups by the callback result and keeps key identity', () => {
    expect(
      run('const m = Map.groupBy([1, 2, 3], (x) => x % 2); return [m.size, m.get(1), m.get(0)];')
    ).toEqual([2, [1, 3], [2]]);
    expect(
      run('const k = {}; const m = Map.groupBy([1, 2], () => k); return [m.get(k), m.get({})];')
    ).toEqual([[1, 2], undefined]);
    expect(run('return Map.groupBy(["a", "b"], (x, i) => i) instanceof Map;')).toBe(true);
    expect(run('return [...Map.groupBy(new Map([[1, 2]]), ([k]) => k).keys()];')).toEqual([1]);
    expect(run('const m = Map.groupBy([1], () => "k"); m.set("x", 1); return m.size;')).toBe(2);
  });

  it('crosses the boundary as a native Map and validates its arguments', () => {
    expect(run('return Map.groupBy([1, 2], (x) => x > 1);')).toEqual(
      new Map([
        [false, [1]],
        [true, [2]]
      ])
    );
    expect(run('try { Map.groupBy(null, (x) => x); } catch (e) { return e.message; }')).toBe(
      'null is not iterable'
    );
    expect(run('try { Map.groupBy([1]); } catch (e) { return e.name; }')).toBe('TypeError');
    expect(
      runAndCatch(new Maple({ maxOps: 300 }), 'Map.groupBy([1], () => { while (true) {} });').code
    ).toBe('LIMIT_EXCEEDED');
  });
});
