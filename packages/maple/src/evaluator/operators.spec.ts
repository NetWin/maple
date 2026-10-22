import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: object): unknown {
  return maple.run(code, data).value;
}

describe('operators', () => {
  describe('arithmetic', () => {
    it('computes with numbers', () => {
      expect(run('return 1 + 2;')).toBe(3);
      expect(run('return 7 % 3;')).toBe(1);
      expect(run('return 2 ** 10;')).toBe(1024);
      expect(run('return 5 / 2;')).toBe(2.5);
      expect(run('return 1 / 0;')).toBe(Number.POSITIVE_INFINITY);
      expect(run('return 2 * 3 - 4;')).toBe(2);
    });

    it('coerces operands without hooks', () => {
      expect(run('return "a" + 1;')).toBe('a1');
      expect(run('return 1 + "2";')).toBe('12');
      expect(run('return "3" * "4";')).toBe(12);
      expect(run('return "x" - 1;')).toBeNaN();
      expect(run('return null + 1;')).toBe(1);
      expect(run('return undefined + 1;')).toBeNaN();
      expect(run('return true + true;')).toBe(2);
      expect(run('return list + "";', { list: [1, [2, 3]] })).toBe('1,2,3');
      expect(run('return obj + "";', { obj: { toString: 'x' } })).toBe('[object Object]');
      expect(run('return empty + 1;', { empty: [] })).toBe('1');
      expect(run('return empty * 2;', { empty: [] })).toBe(0);
      expect(run('const f = () => 1; return "" + f;')).toBe('[function]');
    });

    it('formats numbers exactly like the host', () => {
      expect(run('return 0.1 + 0.2 + "";')).toBe('0.30000000000000004');
      expect(run('return 1e21 + "";')).toBe('1e+21');
      expect(run('return -0 + "";')).toBe('0');
      expect(run('return 1 / 3 + "";')).toBe('0.3333333333333333');
    });
  });

  describe('unary', () => {
    it('applies -, +, ~, ! and void', () => {
      expect(run('return -"5";')).toBe(-5);
      expect(run('return +"3";')).toBe(3);
      expect(run('return ~5;')).toBe(-6);
      expect(run('return !0;')).toBe(true);
      expect(run('return !"a";')).toBe(false);
      expect(run('return void 1;')).toBeUndefined();
    });

    it('reports typeof for every kind of value', () => {
      expect(run('return typeof 1;')).toBe('number');
      expect(run('return typeof "";')).toBe('string');
      expect(run('return typeof true;')).toBe('boolean');
      expect(run('return typeof undefined;')).toBe('undefined');
      expect(run('return typeof null;')).toBe('object');
      expect(run('return typeof (() => 1);')).toBe('function');
      expect(run('return typeof obj;', { obj: {} })).toBe('object');
      expect(run('return typeof list;', { list: [] })).toBe('object');
    });

    it('lets typeof probe undeclared names without throwing', () => {
      expect(run('return typeof missing;')).toBe('undefined');
      expect(run('return typeof Promise;')).toBe('undefined');
    });
  });

  describe('comparison and equality', () => {
    it('compares', () => {
      expect(run('return 1 < 2;')).toBe(true);
      expect(run('return "10" < "9";')).toBe(true);
      expect(run('return "10" < 9;')).toBe(false);
      expect(run('return null >= 0;')).toBe(true);
      expect(run('return undefined < 1;')).toBe(false);
      expect(run('return NaN <= NaN;')).toBe(false);
      expect(run('return 2 > 1 && 2 >= 2;')).toBe(true);
    });

    it('distinguishes loose and strict equality', () => {
      expect(run('return 1 == "1";')).toBe(true);
      expect(run('return 1 === "1";')).toBe(false);
      expect(run('return null == undefined;')).toBe(true);
      expect(run('return null === undefined;')).toBe(false);
      expect(run('return null == 0;')).toBe(false);
      expect(run('return NaN == NaN;')).toBe(false);
      expect(run('return "1" !== 1;')).toBe(true);
      expect(run('return 1 != "1";')).toBe(false);
    });

    it('compares objects by identity, unless coerced against a primitive', () => {
      const data = { a: {}, b: {}, list: [1, 2] };

      expect(run('return a == b;', data)).toBe(false);
      expect(run('return a == a;', data)).toBe(true);
      expect(run('return a === a;', data)).toBe(true);
      expect(run('return list == "1,2";', data)).toBe(true);
      expect(run('return a == "[object Object]";', data)).toBe(true);
    });
  });

  describe('bitwise', () => {
    it('works on 32-bit integers', () => {
      expect(run('return 5 & 3;')).toBe(1);
      expect(run('return 5 | 3;')).toBe(7);
      expect(run('return 5 ^ 3;')).toBe(6);
      expect(run('return 1 << 3;')).toBe(8);
      expect(run('return -8 >> 1;')).toBe(-4);
      expect(run('return -8 >>> 28;')).toBe(15);
    });
  });

  describe('logical and conditional', () => {
    it('short-circuits', () => {
      expect(run('return 0 || "a";')).toBe('a');
      expect(run('return 1 && 2;')).toBe(2);
      expect(run('return 0 && missing;')).toBe(0);
      expect(run('return 1 || missing;')).toBe(1);
      expect(run('return null ?? "d";')).toBe('d');
      expect(run('return 0 ?? "d";')).toBe(0);
      expect(run('return undefined ?? null;')).toBe(null);
      expect(run('return 1 ?? missing;')).toBe(1);
    });

    it('evaluates the conditional and sequence operators', () => {
      expect(run('return 1 ? "y" : "n";')).toBe('y');
      expect(run('return "" ? "y" : "n";')).toBe('n');
      expect(run('return (1, 2);')).toBe(2);
    });
  });

  describe('update and compound assignment', () => {
    it('increments and decrements with prefix and postfix semantics', () => {
      expect(run('let i = 1; i++; return i;')).toBe(2);
      expect(run('let i = 1; return i++;')).toBe(1);
      expect(run('let i = 1; return ++i;')).toBe(2);
      expect(run('let i = 1; return --i;')).toBe(0);
      expect(run('let s = "5"; s++; return s;')).toBe(6);
    });

    it('applies compound operators', () => {
      expect(run('let a = 1; a += 2; return a;')).toBe(3);
      expect(run('let a = 5; a -= 2; return a;')).toBe(3);
      expect(run('let a = 2; a *= 3; return a;')).toBe(6);
      expect(run('let a = 2; a **= 3; return a;')).toBe(8);
      expect(run('let a = 7; a %= 3; return a;')).toBe(1);
      expect(run('let a = 1; a <<= 2; return a;')).toBe(4);
      expect(run('let a = 1; a |= 2; return a;')).toBe(3);
      expect(run('let s = "a"; s += 1; return s;')).toBe('a1');
      expect(run('let a = 1; return a += 1;')).toBe(2);
    });

    it('short-circuits logical assignment', () => {
      expect(run('let a = 0; a ||= 5; return a;')).toBe(5);
      expect(run('let a = 0; a &&= missing; return a;')).toBe(0);
      expect(run('let a = 1; a &&= 5; return a;')).toBe(5);
      expect(run('let b = null; b ??= 3; return b;')).toBe(3);
      expect(run('let b = 0; b ??= 3; return b;')).toBe(0);
    });

    it('rejects writes to constants and globals through compound forms', () => {
      expect(runAndCatch(maple, 'const a = 1; a += 1;').sandboxError?.name).toBe('TypeError');
      expect(runAndCatch(maple, 'n++;', { n: 1 }, { freeze: true }).sandboxError?.message).toBe(
        "Cannot assign to read-only global 'n'"
      );
    });
  });

  describe('template literals', () => {
    it('interpolates with the hook-free string conversion', () => {
      expect(run('return `a${1 + 1}b`;')).toBe('a2b');
      expect(run('return `${"x"}${"y"}`;')).toBe('xy');
      expect(run('return `line\nbreak`;')).toBe('line\nbreak');
      expect(run('return `${obj}`;', { obj: {} })).toBe('[object Object]');
      expect(run('return `${list}`;', { list: [1, 2] })).toBe('1,2');
      expect(run('return `${undefined}|${null}`;')).toBe('undefined|null');
      expect(run('return `plain`;')).toBe('plain');
    });
  });

  it('runs the playground default', () => {
    expect(run('const greeting = "Hello, " + name; return greeting;', { name: 'Maple' })).toBe(
      'Hello, Maple'
    );
  });

  it('counts every operand and operator node', () => {
    expect(maple.run('return 1 + 2;').stats.ops).toBe(4);
  });
});
