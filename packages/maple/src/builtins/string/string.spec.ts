import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

/** Runs `code` with `s` at 2^28 characters and reports what it threw. */
function tooLong(code: string): unknown {
  return run(
    `let s = "x"; for (let i = 0; i < 28; i++) s += s; try { ${code}; } catch (e) { return e.name + ": " + e.message; }`
  );
}

describe('string methods', () => {
  it('search and test', () => {
    expect(run('return "hello".includes("ell");')).toBe(true);
    expect(run('return "hello".indexOf("l");')).toBe(2);
    expect(run('return "hello".indexOf("l", 3);')).toBe(3);
    expect(run('return "hello".lastIndexOf("l");')).toBe(3);
    expect(run('return "hello".startsWith("he");')).toBe(true);
    expect(run('return "hello".startsWith("lo", 3);')).toBe(true);
    expect(run('return "hello".endsWith("lo");')).toBe(true);
    expect(run('return "hello".endsWith("he", 2);')).toBe(true);
  });

  it('slice and index', () => {
    expect(run('return "hello".slice(1, 3);')).toBe('el');
    expect(run('return "hello".slice(-2);')).toBe('lo');
    expect(run('return "hello".substring(3, 1);')).toBe('el');
    expect(run('return "hello".substring(1);')).toBe('ello');
    expect(run('return "hello".at(-1);')).toBe('o');
    expect(run('return "hello".charAt(1);')).toBe('e');
    expect(run('return "hello".charAt();')).toBe('h');
    expect(run('return "A".charCodeAt(0);')).toBe(65);
    expect(run('return "😀".codePointAt(0);')).toBe(0x1f600);
  });

  it('transform', () => {
    expect(run('return " Ab ".trim();')).toBe('Ab');
    expect(run('return " Ab ".trimStart();')).toBe('Ab ');
    expect(run('return " Ab ".trimEnd();')).toBe(' Ab');
    expect(run('return "Ab".toLowerCase();')).toBe('ab');
    expect(run('return "Ab".toUpperCase();')).toBe('AB');
    expect(run('return "5".padStart(3, "0");')).toBe('005');
    expect(run('return "5".padStart(3);')).toBe('  5');
    expect(run('return "5".padEnd(3, "-");')).toBe('5--');
    expect(run('return "ab".repeat(3);')).toBe('ababab');
    expect(run('return "a".concat("b", 1, null);')).toBe('ab1null');
    expect(run('return "\\u0041\\u030A".normalize("NFC").length;')).toBe(1);
    expect(run('return "x".toString();')).toBe('x');
  });

  it('split', () => {
    expect(run('return "a,b,c".split(",");')).toEqual(['a', 'b', 'c']);
    expect(run('return "a,b,c".split(",", 2);')).toEqual(['a', 'b']);
    expect(run('return "abc".split("");')).toEqual(['a', 'b', 'c']);
    expect(run('return "abc".split();')).toEqual(['abc']);
  });

  it('replace with strings and with callbacks', () => {
    expect(run('return "aXbXc".replace("X", "-");')).toBe('a-bXc');
    expect(run('return "aXbXc".replaceAll("X", "-");')).toBe('a-b-c');
    expect(run('return "abc".replace("b", "[$&]");')).toBe('a[b]c');
    expect(run('return "abc".replace("b", (m) => m.toUpperCase());')).toBe('aBc');
    expect(run('return "abab".replaceAll("b", (m, i) => i);')).toBe('a1a3');
    expect(run('return "abc".replace("b", (m, i, s) => s.length);')).toBe('a3c');
  });

  it('coerce arguments without consulting script objects', () => {
    const data = { obj: { toString: 'hooked' }, list: [1] };

    expect(run('return "x[object Object]".indexOf(obj);', data)).toBe(1);
    expect(run('return "a".padStart(3, list);', data)).toBe('11a');
    expect(run('return "abc".slice(list);', data)).toBe('bc');
    expect(run('return "abc".indexOf();')).toBe(-1);
    expect(run('return "undefined".indexOf();')).toBe(0);
    expect(run('return "abc".replace("b", undefined);')).toBe('aundefinedc');
  });

  it('turn host range errors into catchable sandbox errors', () => {
    expect(run('try { "a".repeat(-1); } catch (e) { return e.name; }')).toBe('RangeError');
    expect(run('try { "a".normalize("X"); } catch (e) { return e instanceof RangeError; }')).toBe(
      true
    );
    expect(runAndCatch(maple, '"a".repeat(-1);').sandboxError?.message).toBe(
      'Invalid count value: -1'
    );
  });

  it('make a string that is too long a catchable RangeError wherever it is built', () => {
    expect(tooLong('s + s + s')).toBe('RangeError: Invalid string length');
    expect(tooLong('s += s; s += s')).toBe('RangeError: Invalid string length');
    expect(tooLong('`${s}${s}${s}`')).toBe('RangeError: Invalid string length');
    expect(tooLong('s.concat(s, s)')).toBe('RangeError: Invalid string length');
    expect(tooLong('[s, s, s].join("")')).toBe('RangeError: Invalid string length');
    expect(tooLong('"a".padStart(2 ** 30)')).toBe('RangeError: Invalid string length');
    expect(tooLong('"a".padEnd(2 ** 30)')).toBe('RangeError: Invalid string length');
  });

  it('expose methods as functions that need their string', () => {
    expect(run('return typeof "a".trim;')).toBe('function');
    expect(runAndCatch(maple, 'const t = " a ".trim; t();').sandboxError?.message).toBe(
      'String.prototype.trim called on incompatible receiver undefined'
    );
    expect(run('return "a".trim.foo;')).toBeUndefined();
    expect(run('return "a".foo;')).toBeUndefined();
    expect(run('return "a".trim + "";')).toBe('[function]');
    expect(run('return typeof "a".trim();')).toBe('string');
  });

  it('run callbacks under the budget', () => {
    const error = runAndCatch(
      new Maple({ maxOps: 300 }),
      '"abc".replace("b", () => { while (true) {} });'
    );

    expect(error.code).toBe('LIMIT_EXCEEDED');
  });

  it('work on strings from data and in chains', () => {
    expect(run('return name.trim().toUpperCase().split("").length;', { name: ' maple ' })).toBe(5);
    expect(run('return `${1 + 1}`.padStart(2, "0");')).toBe('02');
  });

  it('still rejects the forbidden keys', () => {
    expect(runAndCatch(maple, '"a".constructor;').sandboxError?.name).toBe('TypeError');
  });
});

describe('String as a function', () => {
  it('converts hook-free', () => {
    expect(run('return String(123);')).toBe('123');
    expect(run('return String();')).toBe('');
    expect(run('return String(undefined);')).toBe('undefined');
    expect(run('return String(null);')).toBe('null');
    expect(run('return String(obj);', { obj: { toString: 1 } })).toBe('[object Object]');
    expect(run('return String(() => 1);')).toBe('[function]');
  });

  it('cannot be constructed, as there are no wrapper objects', () => {
    expect(runAndCatch(maple, 'new String("x");').code).toBe('DISALLOWED_SYNTAX');
  });

  it('exposes its statics', () => {
    expect(run('return String.fromCharCode(72, 105);')).toBe('Hi');
    expect(run('return String.fromCodePoint(0x1f600);')).toBe('😀');
    expect(run('try { String.fromCodePoint(-1); } catch (e) { return e.name; }')).toBe(
      'RangeError'
    );
  });
});

describe('ES2024 and legacy string methods', () => {
  it('check and repair well-formedness', () => {
    expect(run('return ["ab".isWellFormed(), "a\\uD800".isWellFormed()];')).toEqual([true, false]);
    expect(run('return "a\\uD800".toWellFormed() === "a\\uFFFD";')).toBe(true);
  });

  it('implement substr as JavaScript does', () => {
    expect(run('return "abcdef".substr(1, 3);')).toBe('bcd');
    expect(run('return "abcdef".substr(-2);')).toBe('ef');
    expect(run('return "abcdef".substr(-10, 2);')).toBe('ab');
    expect(run('return "abcdef".substr(2, -1);')).toBe('');
    expect(run('return "abcdef".substr(4, 99);')).toBe('ef');
    expect(run('return "abcdef".substr();')).toBe('abcdef');
    expect(run('return "abcdef".substr("1", "2");')).toBe('bc');
    expect(run('return ["abcdef".substr(1, undefined), "abcdef".substr(1, NaN)];')).toEqual([
      'bcdef',
      ''
    ]);
  });

  it('alias trimLeft and trimRight', () => {
    expect(run('return [" a ".trimLeft(), " a ".trimRight()];')).toEqual(['a ', ' a']);
  });
});
