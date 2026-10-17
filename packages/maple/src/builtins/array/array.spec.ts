import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

function opsWith(code: string, list: unknown): number {
  return maple.run(code, { list }).stats.ops;
}

describe('array methods', () => {
  describe('with callbacks', () => {
    it('map, filter, forEach and flatMap pass element, index and array', () => {
      expect(run('return [1, 2, 3].map((x) => x * 2);')).toEqual([2, 4, 6]);
      expect(run('return [1, 2, 3].map((x, i) => i);')).toEqual([0, 1, 2]);
      expect(run('return [1, 2, 3].map((x, i, a) => a.length);')).toEqual([3, 3, 3]);
      expect(run('return [1, 2, 3, 4].filter((x) => x % 2 === 0);')).toEqual([2, 4]);
      expect(run('let s = 0; [1, 2, 3].forEach((x) => { s += x; }); return s;')).toBe(6);
      expect(run('return [1, 2].forEach(() => 1);')).toBeUndefined();
      expect(run('return [1, 2].flatMap((x) => [x, x * 10]);')).toEqual([1, 10, 2, 20]);
      expect(run('return [1, 2].flatMap((x) => x);')).toEqual([1, 2]);
    });

    it('find, some and every short-circuit', () => {
      expect(run('return [1, 2, 3].find((x) => x > 1);')).toBe(2);
      expect(run('return [1, 2, 3].find((x) => x > 5);')).toBeUndefined();
      expect(run('return [1, 2, 3].findIndex((x) => x > 1);')).toBe(1);
      expect(run('return [1, 2, 3].findLast((x) => x < 3);')).toBe(2);
      expect(run('return [1, 2, 3].findLastIndex((x) => x > 5);')).toBe(-1);
      expect(run('return [1, 2, 3].some((x) => x > 2);')).toBe(true);
      expect(run('return [1, 2, 3].every((x) => x > 0);')).toBe(true);
      expect(run('return [].every((x) => false);')).toBe(true);
      expect(run('let n = 0; [1, 2, 3].some((x) => { n++; return x === 1; }); return n;')).toBe(1);
    });

    it('reduce from either end, with and without an initial value', () => {
      expect(run('return [1, 2, 3].reduce((a, b) => a + b);')).toBe(6);
      expect(run('return [1, 2, 3].reduce((a, b) => a + b, 10);')).toBe(16);
      expect(run('return ["a", "b"].reduceRight((a, b) => a + b);')).toBe('ba');
      expect(run('return [].reduce((a, b) => a + b, "init");')).toBe('init');
      expect(run('return [1, 2].reduce((a, b, i) => a + i, 0);')).toBe(1);
      expect(run('try { [].reduce((a, b) => a); } catch (e) { return e.message; }')).toBe(
        'Reduce of empty array with no initial value'
      );
    });

    it('sort through the interpreter, with the default order being by string form', () => {
      expect(run('return [3, 1, 2].sort((a, b) => a - b);')).toEqual([1, 2, 3]);
      expect(run('return [3, 1, 2].sort((a, b) => b - a);')).toEqual([3, 2, 1]);
      expect(run('return [10, 9, 1].sort();')).toEqual([1, 10, 9]);
      expect(run('return [undefined, 2, 1].sort();')).toEqual([1, 2, undefined]);
      expect(run('return ["b", "a"].sort();')).toEqual(['a', 'b']);
      expect(run('const l = [2, 1]; const s = l.toSorted(); return [l, s];')).toEqual([
        [2, 1],
        [1, 2]
      ]);
      expect(run('return [{ n: 2 }, { n: 1 }].sort((a, b) => a.n - b.n).map((o) => o.n);')).toEqual(
        [1, 2]
      );
    });

    it('reject non-callable callbacks and run callbacks under the budget', () => {
      expect(run('try { [1].map(5); } catch (e) { return e.message; }')).toBe(
        '5 is not a function'
      );
      expect(run('try { [1].map(); } catch (e) { return e.name; }')).toBe('TypeError');
      const error = runAndCatch(new Maple({ maxOps: 300 }), '[1].map(() => { while (true) {} });');
      expect(error.code).toBe('LIMIT_EXCEEDED');
      const deep = runAndCatch(
        new Maple({ maxDepth: 3 }),
        'function f() { return [1].map(f); } f();'
      );
      expect(deep.code).toBe('LIMIT_EXCEEDED');
    });
  });

  describe('flat and flatMap', () => {
    it('charge one operation per element visited, nested arrays included', () => {
      expect(
        opsWith('return list.flat();', [[1, 2], [3]]) - opsWith('return list.flat();', [])
      ).toBe(5);
      expect(
        opsWith('return list.flatMap((x) => x);', [[1, 2, 3]]) -
          opsWith('return list.flatMap((x) => x);', [[1]])
      ).toBe(2);
    });

    it('pay for every path through an array reached from several slots', () => {
      const bounded = new Maple({ maxOps: 10_000 });

      expect(
        runAndCatch(
          bounded,
          'let a = []; for (let i = 0; i < 60; i++) a = [a, a]; a.flat(Infinity);'
        ).code
      ).toBe('LIMIT_EXCEEDED');
    });

    it('refuse arrays nested deeper than 1000 levels with a catchable RangeError', () => {
      expect(
        run(
          'let a = []; for (let i = 0; i < 1001; i++) a = [a]; try { a.flat(Infinity); } catch (e) { return e.name + ": " + e.message; }'
        )
      ).toBe('RangeError: An array nested deeper than 1000 levels cannot be flattened');
      expect(
        run('let a = []; for (let i = 0; i < 999; i++) a = [a]; return a.flat(Infinity);')
      ).toEqual([]);
    });
  });

  describe('without callbacks', () => {
    it('read', () => {
      expect(run('return [1, 2, 3].at(-1);')).toBe(3);
      expect(run('return [1, 2, 3].slice(1);')).toEqual([2, 3]);
      expect(run('return [1, 2, 3].slice(-2, -1);')).toEqual([2]);
      expect(run('return [1, [2, [3]]].flat();')).toEqual([1, 2, [3]]);
      expect(run('return [1, [2, [3]]].flat(Infinity);')).toEqual([1, 2, 3]);
      expect(run('return [1, [2, [3]]].flat(0);')).toEqual([1, [2, [3]]]);
      expect(run('return [1, [2, [3]]].flat(-1);')).toEqual([1, [2, [3]]]);
      expect(run('return [1, [2, [3]]].flat("x");')).toEqual([1, [2, [3]]]);
      expect(run('return [1, [2, [3]]].flat(1.9);')).toEqual([1, 2, [3]]);
      expect(run('const a = [1]; a[2] = [2]; a[2][2] = 3; return a.flat();')).toEqual([1, 2, 3]);
      expect(run('return [1, 2].concat([3], 4, [[5]]);')).toEqual([1, 2, 3, 4, [5]]);
      expect(run('return [1, 2, 3].includes(2);')).toBe(true);
      expect(run('return [NaN].includes(NaN);')).toBe(true);
      expect(run('return [1, 2, 1].indexOf(1, 1);')).toBe(2);
      expect(run('return [1, 2, 1].lastIndexOf(1);')).toBe(2);
      expect(run('return [1, 2, 1].lastIndexOf(1, 1);')).toBe(0);
      expect(run('return [1, 2, 3].with(0, 9);')).toEqual([9, 2, 3]);
      expect(run('return [1, 2].toReversed();')).toEqual([2, 1]);
      expect(run('return [1, 2, 3].toSpliced(1, 1, "x");')).toEqual([1, 'x', 3]);
      expect(run('try { [1].with(5, 1); } catch (e) { return e.name; }')).toBe('RangeError');
    });

    it('join and toString with the hook-free element conversion', () => {
      expect(run('return [1, "a", null, undefined, [2, 3]].join("-");')).toBe('1-a---2,3');
      expect(run('return [1, 2].join();')).toBe('1,2');
      expect(run('return [{ toString: "x" }, () => 1].join();')).toBe('[object Object],[function]');
      expect(run('return [1, [2]].toString();')).toBe('1,2');
    });

    it('mutate script arrays', () => {
      expect(run('const l = [1]; const n = l.push(2, 3); return [n, l];')).toEqual([3, [1, 2, 3]]);
      expect(run('const l = [1, 2]; return [l.pop(), l];')).toEqual([2, [1]]);
      expect(run('const l = [1, 2]; return [l.shift(), l];')).toEqual([1, [2]]);
      expect(run('const l = [2]; l.unshift(0, 1); return l;')).toEqual([0, 1, 2]);
      expect(run('const l = [1, 2, 3]; return [l.reverse(), l];')).toEqual([
        [3, 2, 1],
        [3, 2, 1]
      ]);
      expect(run('const l = [1, 2, 3, 4]; const r = l.splice(1, 2, "x"); return [r, l];')).toEqual([
        [2, 3],
        [1, 'x', 4]
      ]);
      expect(run('const l = [1, 2, 3]; return [l.splice(1), l];')).toEqual([[2, 3], [1]]);
      expect(run('const l = [1, 2, 3]; return [l.splice(), l];')).toEqual([[], [1, 2, 3]]);
      expect(run('return [1, 2, 3].fill(0, 1);')).toEqual([1, 0, 0]);
      expect(run('return [1, 2, 3, 4].copyWithin(0, 2);')).toEqual([3, 4, 3, 4]);
    });

    it('refuse to mutate input arrays but still read them', () => {
      const data = { list: [3, 1, 2] };

      expect(runAndCatch(maple, 'list.push(4);', data).sandboxError).toMatchObject({
        name: 'TypeError',
        message: 'Cannot add property 3, object is not extensible'
      });
      expect(runAndCatch(maple, 'list.sort();', data).sandboxError?.name).toBe('TypeError');
      expect(runAndCatch(maple, 'list.pop();', data).sandboxError?.name).toBe('TypeError');
      expect(run('return list.toSorted();', data)).toEqual([1, 2, 3]);
      expect(run('return list.map((x) => x * 2);', data)).toEqual([6, 2, 4]);
      expect(run('return list.slice().sort();', data)).toEqual([1, 2, 3]);
      expect(run('return list;', data)).toEqual([3, 1, 2]);
    });
  });

  it('exposes methods as functions that need their array', () => {
    expect(run('const p = [].push; return typeof p;')).toBe('function');
    expect(runAndCatch(maple, 'const l = []; const p = l.push; p(1);').sandboxError?.message).toBe(
      'Array.prototype.push called on incompatible receiver undefined'
    );
    expect(run('return "map" in [];')).toBe(true);
    expect(run('return "valueOf" in [];')).toBe(false);
    expect(run('return [].map.call;')).toBeUndefined();
  });
});

describe('Array statics', () => {
  it('isArray, of and from', () => {
    expect(run('return [Array.isArray([]), Array.isArray({}), Array.isArray("a")];')).toEqual([
      true,
      false,
      false
    ]);
    expect(run('return Array.of(1, "a");')).toEqual([1, 'a']);
    expect(run('return Array.from("ab");')).toEqual(['a', 'b']);
    expect(run('return Array.from([1, 2], (x) => x * 2);')).toEqual([2, 4]);
    expect(run('return Array.from([1, 2], (x, i) => i);')).toEqual([0, 1]);
    expect(run('return Array.from({ length: 2 });')).toEqual([undefined, undefined]);
    expect(run('return Array.from({ length: 2, 0: "a", 1: "b" });')).toEqual(['a', 'b']);
    expect(run('return Array.from(list);', { list: [1] })).toEqual([1]);
    expect(run('return Array.from({ length: 3 }, (_, i) => i);')).toEqual([0, 1, 2]);
    expect(run('try { Array.from(5); } catch (e) { return e.message; }')).toBe('5 is not iterable');
    expect(run('try { Array.from([], 5); } catch (e) { return e.message; }')).toBe(
      '5 is not a function'
    );
    expect(run('return Array.foo;')).toBeUndefined();
  });

  it('from reads an array-like length as ToLength does', () => {
    expect(run('return Array.from({ length: 1.5, 0: "a", 1: "b" });')).toEqual(['a']);
    expect(run('return Array.from({ length: -1, 0: "a" });')).toEqual([]);
    expect(run('return Array.from({ length: "2", 0: "a", 1: "b" });')).toEqual(['a', 'b']);
    expect(run('return Array.from({ length: NaN, 0: "a" });')).toEqual([]);
  });

  it('from maps each item as it is read', () => {
    expect(
      run('const a = [1, 2]; return Array.from(a, (x, i) => { if (i === 0) a[1] = 9; return x; });')
    ).toEqual([1, 9]);
    expect(
      run(
        'const o = { length: 2, 0: 1, 1: 2 }; return Array.from(o, (x, i) => { if (i === 0) o[1] = 9; return x; });'
      )
    ).toEqual([1, 9]);
  });
});

describe('holes', () => {
  it('are skipped by the callback methods', () => {
    const code =
      'const seen = []; const a = [1, , 3]; a.forEach((x, i) => seen.push(i)); a.some((x, i) => { seen.push(i); }); a.every((x, i) => seen.push(i)); a.reduce((acc, x, i) => seen.push(i), 0); a.reduceRight((acc, x, i) => seen.push(i), 0); return seen;';
    expect(run(code)).toEqual([0, 2, 0, 2, 0, 2, 0, 2, 2, 0]);
    expect(run('return [[1, , 3].filter(() => true), [1, , [2]].flatMap((x) => x)];')).toEqual([
      [1, 3],
      [1, 2]
    ]);
  });

  it('are kept by map, which never calls back for them', () => {
    expect(
      run(
        'let n = 0; const r = [1, , 3].map((x) => { n++; return x * 2; }); return [n, r.length, 1 in r, r[2]];'
      )
    ).toEqual([2, 3, false, 6]);
  });

  it('are visited as undefined by the find methods', () => {
    expect(
      run('const seen = []; [1, , 3].find((x, i) => { seen.push(x); }); return seen;')
    ).toEqual([1, undefined, 3]);
    expect(
      run(
        'return [[1, , 3].findIndex((x) => x === undefined), [, 1].findLastIndex((x) => x === undefined)];'
      )
    ).toEqual([1, 0]);
  });

  it('are not found by indexOf, but count as undefined for includes', () => {
    expect(
      run(
        'return [[1, , 3].indexOf(undefined), [1, , 3].lastIndexOf(undefined), [1, , 3].includes(undefined)];'
      )
    ).toEqual([-1, -1, true]);
  });

  it('leave reduce without a first value to start from', () => {
    expect(run('return [, 1].reduce((a, b) => a + b);')).toBe(1);
    expect(runAndCatch(maple, '[, ,].reduce((a, b) => a + b);').sandboxError?.name).toBe(
      'TypeError'
    );
  });
});

describe('Array as a function and a constructor', () => {
  it('makes an array of its arguments', () => {
    expect(run('return [Array(1, 2), new Array("a"), Array(), new Array()];')).toEqual([
      [1, 2],
      ['a'],
      [],
      []
    ]);
  });

  it('makes holes for a single number, one operation each', () => {
    expect(
      run('const a = new Array(3); return [a.length, 0 in a, 1 in a, 2 in a, typeof Array];')
    ).toEqual([3, false, false, false, 'function']);
    expect(opsWith('return Array(1000);', []) - opsWith('return Array(0);', [])).toBe(1000);
  });

  it('refuses a length that is no array length', () => {
    expect(runAndCatch(maple, 'Array(-1);').sandboxError).toMatchObject({
      name: 'RangeError',
      message: 'Invalid array length'
    });
    expect(runAndCatch(maple, 'new Array(1.5);').sandboxError?.name).toBe('RangeError');
  });
});
