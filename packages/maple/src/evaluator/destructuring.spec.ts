import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

function sandboxError(code: string, data?: unknown): { name: string; message: string } | undefined {
  return runAndCatch(maple, code, data).sandboxError;
}

describe('destructuring', () => {
  const data = { obj: { a: 1, b: 2, c: { d: 3 } }, list: [1, 2, 3], pairs: [[1, 'one']] };

  describe('object patterns', () => {
    it('bind, rename, default and nest', () => {
      expect(run('const { a, b } = obj; return a + b;', data)).toBe(3);
      expect(run('let { a: x } = obj; return x;', data)).toBe(1);
      expect(run('var { z = 5 } = obj; return z;', data)).toBe(5);
      expect(run('const { a = 5 } = obj; return a;', data)).toBe(1);
      expect(run('const { c: { d } } = obj; return d;', data)).toBe(3);
      expect(run('const k = "b"; const { [k]: v } = obj; return v;', data)).toBe(2);
      expect(run('const { missing } = obj; return missing;', data)).toBeUndefined();
    });

    it('collect the rest into a fresh mutable object', () => {
      expect(run('const { a, ...rest } = obj; rest.x = 1; return rest;', data)).toEqual({
        b: 2,
        c: { d: 3 },
        x: 1
      });
    });

    it('work on arrays and strings too', () => {
      expect(run('const { length } = list; return length;', data)).toBe(3);
      expect(run('const { length, 0: first } = "abc"; return first + length;')).toBe('a3');
    });

    it('reject null and undefined', () => {
      expect(sandboxError('const { a } = undefined;')).toMatchObject({
        name: 'TypeError',
        message: "Cannot destructure 'undefined' as it is undefined."
      });
      expect(sandboxError('const { a } = nothing;', { nothing: null })?.message).toBe(
        "Cannot destructure 'null' as it is null."
      );
    });

    it('reject forbidden keys', () => {
      expect(sandboxError('const { __proto__: p } = obj;', data)?.name).toBe('TypeError');
    });
  });

  describe('array patterns', () => {
    it('bind by position with holes, defaults, nesting and rest', () => {
      expect(run('const [a, b] = list; return a + b;', data)).toBe(3);
      expect(run('const [, second] = list; return second;', data)).toBe(2);
      expect(run('const [a, ...r] = list; return r;', data)).toEqual([2, 3]);
      expect(run('const [a = 9, b = 9] = [1]; return a + b;')).toBe(10);
      expect(run('const [[a]] = [[7]]; return a;')).toBe(7);
      expect(run('const [a, b, c, d] = list; return d;', data)).toBeUndefined();
      expect(run('const [c] = "xy"; return c;')).toBe('x');
    });

    it('reject values that are not iterable', () => {
      expect(sandboxError('const [a] = obj;', data)).toMatchObject({
        name: 'TypeError',
        message: 'obj is not iterable'
      });
      expect(sandboxError('const [a] = 5;')?.message).toBe('5 is not iterable');
      expect(sandboxError('const [a] = undefined;')?.message).toBe('undefined is not iterable');
    });
  });

  describe('in parameters', () => {
    it('destructure arguments with defaults and rest', () => {
      expect(run('function f({ a, b = 2 }) { return a + b; } return f({ a: 1 });')).toBe(3);
      expect(run('const f = ([x, y]) => x * y; return f([3, 4]);')).toBe(12);
      expect(run('const f = ({ a } = { a: 8 }) => a; return f();')).toBe(8);
      expect(run('const f = (...[first]) => first; return f(5, 6);')).toBe(5);
      expect(run('const f = ({ c: { d } }) => d; return f(obj);', data)).toBe(3);
    });
  });

  describe('in assignments', () => {
    it('assign to names and members and evaluate to the right-hand side', () => {
      expect(run('let a, b; [a, b] = [1, 2]; return a + b;')).toBe(3);
      expect(run('let a = 1, b = 2; [a, b] = [b, a]; return [a, b];')).toEqual([2, 1]);
      expect(run('let a, b; ({ a, b } = obj); return a + b;', data)).toBe(3);
      expect(run('const o = {}; [o.x, o.y] = [1, 2]; return o;')).toEqual({ x: 1, y: 2 });
      expect(run('let a; return ([a] = [7]);')).toEqual([7]);
      expect(run('let a; ({ a = 4 } = {}); return a;')).toBe(4);
    });

    it('respect const and read-only bindings', () => {
      expect(sandboxError('const a = 1; [a] = [2];')?.name).toBe('TypeError');
      expect(sandboxError('({ a: obj } = {});', data)?.message).toBe(
        "Cannot assign to read-only global 'obj'"
      );
    });
  });

  describe('in loop heads', () => {
    it('destructure each element', () => {
      expect(run('let s = ""; for (const [n, w] of pairs) { s += n + w; } return s;', data)).toBe(
        '1one'
      );
      expect(run('let s = 0; for (const { a } of [obj, obj]) { s += a; } return s;', data)).toBe(2);
      expect(run('let x, y; for ([x, y] of pairs) {} return y;', data)).toBe('one');
    });
  });

  describe('hoisting', () => {
    it('hoists every name a pattern introduces', () => {
      expect(run('{ var { a } = obj; } return a;', data)).toBe(1);
      expect(sandboxError('return a; const { a } = obj;', data)?.message).toBe(
        "Cannot access 'a' before initialization"
      );
    });
  });
});
