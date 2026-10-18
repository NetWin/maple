import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('RegExp', () => {
  it('comes from literals and from the constructor', () => {
    expect(run('return /a+/g.source;')).toBe('a+');
    expect(run('return /a+/gi.flags;')).toBe('gi');
    expect(run('return new RegExp("a+", "g").flags;')).toBe('g');
    expect(run('return RegExp("x").test("x");')).toBe(true);
    expect(run('return new RegExp(/a/g).flags;')).toBe('g');
    expect(run('return new RegExp(/a/g, "i").flags;')).toBe('i');
    expect(run('return new RegExp().source;')).toBe('(?:)');
    expect(run('return /x/ instanceof RegExp;')).toBe(true);
    expect(run('return typeof /x/;')).toBe('object');
    expect(run('try { new RegExp("("); } catch (e) { return e.name; }')).toBe('SyntaxError');
  });

  it('tests and executes with real lastIndex semantics', () => {
    expect(run('return /b/.test("abc");')).toBe(true);
    expect(
      run('const r = /a/g; return [r.test("aa"), r.lastIndex, r.test("aa"), r.test("aa")];')
    ).toEqual([true, 1, true, false]);
    expect(run('const r = /a/y; r.lastIndex = 1; return r.test("ba");')).toBe(true);
    expect(run('return /x/.lastIndex;')).toBe(0);
    expect(
      run('const m = /(\\d)(\\d)?/.exec("a1"); return [m[0], m[1], m[2], m.index, m.input];')
    ).toEqual(['1', '1', undefined, 1, 'a1']);
    expect(run('return /x/.exec("y");')).toBe(null);
    expect(run('const m = /(?<year>\\d{4})/.exec("in 2024"); return m.groups.year;')).toBe('2024');
    expect(run('return /(a)/.exec("a").groups;')).toBeUndefined();
    expect(run('return /a/g.exec("a").index;')).toBe(0);
  });

  it('exposes its properties read-only except lastIndex', () => {
    expect(
      run(
        'const r = /a/gimsuy; return [r.global, r.ignoreCase, r.multiline, r.dotAll, r.unicode, r.sticky];'
      )
    ).toEqual([true, true, true, true, true, true]);
    expect(run('return /a/.hasIndices;')).toBe(false);
    expect(run('return "source" in /a/ && !("foo" in /a/);')).toBe(true);
    expect(run('return /a/.foo;')).toBeUndefined();
    expect(runAndCatch(maple, '/a/.source = "b";').sandboxError?.message).toBe(
      "Cannot assign to read-only property 'source' of a RegExp"
    );
    expect(
      run('const r = /a/g; r.label = "x"; return [r.label, Object.keys(r), r.test("a")];')
    ).toEqual(['x', ['label'], true]);
    expect(runAndCatch(maple, '/a/.constructor;').sandboxError?.name).toBe('TypeError');
    expect(run('return /a\\/b/gi.toString();')).toBe('/a\\/b/gi');
    expect(run('return /a/g + "";')).toBe('/a/g');
  });

  it('is read-only when it came from the input', () => {
    const data = { pattern: /a/g };

    expect(run('return pattern.test("a");', data)).toBe(true);
    expect(run('return pattern instanceof RegExp;', data)).toBe(true);
    expect(runAndCatch(maple, 'pattern.lastIndex = 0;', data).sandboxError?.message).toBe(
      "Cannot assign to read-only property 'lastIndex' of a RegExp"
    );
    expect(runAndCatch(maple, 'pattern.label = 1;', data).sandboxError?.message).toBe(
      'Cannot add property label, object is not extensible'
    );
  });

  type Row = { flags: string; code: string };

  // A sticky regexp that is not global fails replaceAll before lastIndex comes into it
  it.each`
    flags  | code
    ${'g'} | ${'r.lastIndex = 1;'}
    ${'y'} | ${'r.lastIndex = 1;'}
    ${'g'} | ${'r.exec("a");'}
    ${'y'} | ${'r.exec("a");'}
    ${'g'} | ${'r.test("a");'}
    ${'y'} | ${'r.test("a");'}
    ${'g'} | ${'"a".match(r);'}
    ${'y'} | ${'"a".match(r);'}
    ${'g'} | ${'"a".search(r);'}
    ${'y'} | ${'"a".search(r);'}
    ${'g'} | ${'"a".replace(r, "b");'}
    ${'y'} | ${'"a".replace(r, "b");'}
    ${'g'} | ${'"a".replaceAll(r, "b");'}
  `('keeps lastIndex as it is once frozen: /a/$flags, $code', ({ flags, code }: Row) => {
    expect(
      runAndCatch(maple, `const r = Object.freeze(/a/${flags}); ${code}`).sandboxError?.message
    ).toBe("Cannot assign to read-only property 'lastIndex' of a RegExp");
  });

  it('still matches once frozen when it writes no lastIndex', () => {
    expect(
      run(
        'const r = Object.freeze(/a/); return [r.test("a"), r.exec("ba").index, "aa".replace(r, "b"), r.lastIndex];'
      )
    ).toEqual([true, 1, 'ba', 0]);
    expect(
      run(
        'const r = Object.freeze(/,/g); return ["a,b".split(r), [..."a,b,c".matchAll(r)].length, r.lastIndex];'
      )
    ).toEqual([['a', 'b'], 2, 0]);
  });

  it('carries no lastIndex from one run to the next when it is an instance global', () => {
    const shared = new Maple({ globals: { pattern: /a/g } });

    expect(
      shared.run('return [pattern.test("aa"), pattern.test("aa"), pattern.lastIndex];').value
    ).toEqual([true, true, 0]);
    expect(shared.run('return [pattern.lastIndex, pattern.exec("ba").index];').value).toEqual([
      0, 1
    ]);
    expect(
      shared.run(
        'const copy = new RegExp(pattern); copy.test("a"); return [copy.lastIndex, pattern.lastIndex];'
      ).value
    ).toEqual([1, 0]);
  });
});

describe('string methods with regexps', () => {
  it('match, matchAll and search', () => {
    expect(run('return "a1b22".match(/\\d+/g);')).toEqual(['1', '22']);
    expect(run('const m = "a1b".match(/(\\d)/); return [m[0], m[1], m.index];')).toEqual([
      '1',
      '1',
      1
    ]);
    expect(run('return "abc".match(/x/);')).toBe(null);
    expect(run('return "abc".match("b").index;')).toBe(1);
    expect(run('return "a.c".match("a.c")[0];')).toBe('a.c');
    expect(run('return "abc".match()[0];')).toBe('');
    expect(run('return [..."a1b2".matchAll(/\\d/g)].map((m) => m[0] + m.index);')).toEqual([
      '11',
      '23'
    ]);
    expect(run('return [..."a1".matchAll("\\\\d")].length;')).toBe(1);
    expect(
      run(
        'const it = "ab".matchAll(/./g); const first = it.next(); return [first.done, first.value[0]];'
      )
    ).toEqual([false, 'a']);
    expect(run('try { "a".matchAll(/a/); } catch (e) { return e.name; }')).toBe('TypeError');
    expect(run('return "abc".search(/c/);')).toBe(2);
    expect(run('return "abc".search("z");')).toBe(-1);
  });

  it('replace, replaceAll and split', () => {
    expect(run('return "a1b2".replace(/\\d/, "#");')).toBe('a#b2');
    expect(run('return "a1b2".replace(/\\d/g, "#");')).toBe('a#b#');
    expect(run('return "a1b2".replaceAll(/\\d/g, "#");')).toBe('a#b#');
    expect(run('return "john smith".replace(/(\\w+) (\\w+)/, "$2, $1");')).toBe('smith, john');
    expect(run('return "2024-01".replace(/(?<y>\\d+)-(?<m>\\d+)/, "$<m>/$<y>");')).toBe('01/2024');
    expect(run('return "a1b2".replace(/\\d/g, (d) => d * 2);')).toBe('a2b4');
    expect(run('return "a1".replace(/(\\d)/, (m, g1, offset, s) => `${g1}@${offset}/${s}`);')).toBe(
      'a1@1/a1'
    );
    expect(
      run('return "x2024".replace(/(?<y>\\d+)/, (m, g1, o, s, groups) => groups.y.length);')
    ).toBe('x4');
    expect(run('return "a,b;c".split(/[,;]/);')).toEqual(['a', 'b', 'c']);
    expect(run('return "a1b".split(/(\\d)/);')).toEqual(['a', '1', 'b']);
    expect(run('try { "a".replaceAll(/a/, "b"); } catch (e) { return e.name; }')).toBe('TypeError');
  });

  it('gives named groups an object without a prototype, as JavaScript does', () => {
    const m = 'const m = "2024-03".match(/(?<y>\\d+)-(?<m>\\d+)/);';
    expect(run(`${m} return [m.groups.y, m.groups.m, typeof m.groups.toString];`)).toEqual([
      '2024',
      '03',
      'undefined'
    ]);
    expect(run(`${m} try { String(m.groups); } catch (e) { return e.message; }`)).toBe(
      'Cannot convert object to primitive value'
    );
    expect(
      run(
        'return "x2024".replace(/(?<y>\\d+)/, (match, g1, o, s, groups) => [typeof groups.hasOwnProperty, groups.y]);'
      )
    ).toBe('xundefined,2024');
    expect(
      run(
        'return "a1a2".replaceAll(/(?<d>\\d)/g, (match, g1, o, s, groups) => typeof groups.toString);'
      )
    ).toBe('aundefinedaundefined');
    expect(run('return /(a)/.exec("a").groups;')).toBeUndefined();
  });

  it('keeps the match conversion and the callbacks under the budget', () => {
    const error = runAndCatch(
      new Maple({ maxOps: 300 }),
      '"aaa".replace(/a/g, () => { while (true) {} });'
    );

    expect(error.code).toBe('LIMIT_EXCEEDED');
    expect(run('const m = "a".match(/(?<x>a)/); return m;')).toMatchObject({
      0: 'a',
      index: 0,
      groups: { x: 'a' }
    });
  });
});

describe('RegExp unicodeSets', () => {
  it('reports the v flag', () => {
    expect(run('return [/a/v.unicodeSets, /a/u.unicodeSets];')).toEqual([true, false]);
  });
});
