import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('Math', () => {
  it('converts every argument hook-free and delegates to the host', () => {
    expect(run('return Math.max(1, "3", list);', { list: [2] })).toBe(3);
    expect(run('return Math.max();')).toBe(Number.NEGATIVE_INFINITY);
    expect(run('return Math.min(4, 2);')).toBe(2);
    expect(run('return Math.round(2.5);')).toBe(3);
    expect(run('return Math.floor(-1.5);')).toBe(-2);
    expect(run('return Math.ceil(1.1);')).toBe(2);
    expect(run('return Math.trunc(-1.9);')).toBe(-1);
    expect(run('return Math.abs(-3);')).toBe(3);
    expect(run('return Math.pow(2, 8);')).toBe(256);
    expect(run('return Math.sqrt(81);')).toBe(9);
    expect(run('return Math.sign(-7);')).toBe(-1);
    expect(run('return Math.hypot(3, 4);')).toBe(5);
    expect(run('return Math.max(obj, 1);', { obj: {} })).toBeNaN();
    expect(run('return Math.PI;')).toBe(Math.PI);
    expect(run('const r = Math.random(); return r >= 0 && r < 1;')).toBe(true);
  });

  it('computes every other function and constant like the host', () => {
    expect(run('return Math.acos(0.5);')).toBe(Math.acos(0.5));
    expect(run('return Math.acosh(2);')).toBe(Math.acosh(2));
    expect(run('return Math.asin(0.5);')).toBe(Math.asin(0.5));
    expect(run('return Math.asinh(1);')).toBe(Math.asinh(1));
    expect(run('return Math.atan(1);')).toBe(Math.atan(1));
    expect(run('return Math.atanh(0.5);')).toBe(Math.atanh(0.5));
    expect(run('return Math.atan2(1, 2);')).toBe(Math.atan2(1, 2));
    expect(run('return Math.cbrt(27);')).toBe(Math.cbrt(27));
    expect(run('return Math.cos(1);')).toBe(Math.cos(1));
    expect(run('return Math.cosh(1);')).toBe(Math.cosh(1));
    expect(run('return Math.exp(1);')).toBe(Math.exp(1));
    expect(run('return Math.expm1(1);')).toBe(Math.expm1(1));
    expect(run('return Math.fround(5.5);')).toBe(Math.fround(5.5));
    expect(run('return Math.log(10);')).toBe(Math.log(10));
    expect(run('return Math.log10(1000);')).toBe(Math.log10(1000));
    expect(run('return Math.log1p(1);')).toBe(Math.log1p(1));
    expect(run('return Math.log2(8);')).toBe(Math.log2(8));
    expect(run('return Math.sin(1);')).toBe(Math.sin(1));
    expect(run('return Math.sinh(1);')).toBe(Math.sinh(1));
    expect(run('return Math.tan(1);')).toBe(Math.tan(1));
    expect(run('return Math.tanh(1);')).toBe(Math.tanh(1));
    expect(run('return Math.clz32(1);')).toBe(31);
    expect(run('return Math.imul(3, "4");')).toBe(12);
    expect(run('return Math.E;')).toBe(Math.E);
    expect(run('return Math.LN10;')).toBe(Math.LN10);
    expect(run('return Math.LN2;')).toBe(Math.LN2);
    expect(run('return Math.LOG10E;')).toBe(Math.LOG10E);
    expect(run('return Math.LOG2E;')).toBe(Math.LOG2E);
    expect(run('return Math.SQRT1_2;')).toBe(Math.SQRT1_2);
    expect(run('return Math.SQRT2;')).toBe(Math.SQRT2);
  });

  it('is a read-only namespace', () => {
    expect(run('return typeof Math;')).toBe('object');
    expect(run('return typeof Math.max;')).toBe('function');
    expect(run('return Math.foo;')).toBeUndefined();
    expect(run('return "max" in Math;')).toBe(true);
    expect(run('return Math instanceof Object;')).toBe(true);
    expect(runAndCatch(maple, 'Math.PI = 3;').sandboxError?.message).toBe(
      "Cannot assign to read-only property 'PI'"
    );
    expect(runAndCatch(maple, 'delete Math.PI;').sandboxError?.name).toBe('TypeError');
    expect(runAndCatch(maple, 'new Math();').code).toBe('DISALLOWED_SYNTAX');
    expect(runAndCatch(maple, 'Math();').sandboxError?.message).toBe('Math is not a function');
  });

  it('never leaves the sandbox', () => {
    expect(run('return Math;')).toBeUndefined();
    expect(run('return [Math.max];')).toEqual([undefined]);
  });
});
