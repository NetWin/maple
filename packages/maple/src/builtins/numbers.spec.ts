import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('number methods', () => {
  it('format numbers', () => {
    expect(run('return (1.005).toFixed(2);')).toBe('1.00');
    expect(run('return (3).toFixed();')).toBe('3');
    expect(run('return (123.456).toPrecision(4);')).toBe('123.5');
    expect(run('return (123.456).toPrecision();')).toBe('123.456');
    expect(run('return (12345).toExponential(1);')).toBe('1.2e+4');
    expect(run('return (255).toString(16);')).toBe('ff');
    expect(run('return (255).toString();')).toBe('255');
    expect(run('return (0.1 + 0.2).toFixed(1);')).toBe('0.3');
  });

  it('throw RangeError for digits and radix out of range', () => {
    expect(run('try { (1).toFixed(101); } catch (e) { return e.name; }')).toBe('RangeError');
    expect(run('try { (1).toString(1); } catch (e) { return e.name; }')).toBe('RangeError');
  });

  it('are bound functions like string methods', () => {
    expect(run('const f = (7).toFixed; return f(1);')).toBe('7.0');
    expect(run('return n.toFixed(1);', { n: 2 })).toBe('2.0');
  });
});

describe('Number as a function', () => {
  it('converts hook-free', () => {
    expect(run('return Number("12");')).toBe(12);
    expect(run('return Number("");')).toBe(0);
    expect(run('return Number(obj);', { obj: {} })).toBeNaN();
    expect(run('return Number(list);', { list: [5] })).toBe(5);
    expect(run('return Number();')).toBe(0);
    expect(run('return Number(null);')).toBe(0);
  });

  it('cannot be constructed, as there are no wrapper objects', () => {
    expect(runAndCatch(maple, 'new Number(1);').code).toBe('DISALLOWED_SYNTAX');
  });

  it('exposes its statics', () => {
    expect(run('return Number.isInteger(5) && !Number.isInteger(5.5);')).toBe(true);
    expect(run('return Number.isInteger("5");')).toBe(false);
    expect(run('return Number.isNaN(NaN) && !Number.isNaN("x");')).toBe(true);
    expect(run('return Number.isFinite(1) && !Number.isFinite(Infinity);')).toBe(true);
    expect(run('return Number.isSafeInteger(2 ** 53);')).toBe(false);
    expect(run('return Number.parseInt("42px");')).toBe(42);
    expect(run('return Number.parseFloat("1.5x");')).toBe(1.5);
    expect(run('return Number.MAX_SAFE_INTEGER;')).toBe(Number.MAX_SAFE_INTEGER);
    expect(run('return Number.EPSILON > 0;')).toBe(true);
    expect(run('return Number.MIN_SAFE_INTEGER;')).toBe(Number.MIN_SAFE_INTEGER);
    expect(run('return Number.MAX_VALUE;')).toBe(Number.MAX_VALUE);
    expect(run('return Number.MIN_VALUE;')).toBe(Number.MIN_VALUE);
  });
});

describe('global number functions', () => {
  it('parse and test numbers', () => {
    expect(run('return parseInt("42px");')).toBe(42);
    expect(run('return parseInt("ff", 16);')).toBe(255);
    expect(run('return parseInt("x");')).toBeNaN();
    expect(run('return parseFloat("1.5e2x");')).toBe(150);
    expect(run('return isNaN("x") && !isNaN("1");')).toBe(true);
    expect(run('return isFinite("1") && !isFinite("x");')).toBe(true);
    expect(run('return parseInt(list);', { list: ['7'] })).toBe(7);
  });

  it('are plain function values', () => {
    expect(run('return typeof parseInt;')).toBe('function');
    expect(run('const p = parseInt; return p("8");')).toBe(8);
    expect(run('return [parseInt.length, parseInt.name];')).toEqual([2, 'parseInt']);
    expect(runAndCatch(maple, 'parseInt.x = 1;').sandboxError?.name).toBe('TypeError');
  });
});
