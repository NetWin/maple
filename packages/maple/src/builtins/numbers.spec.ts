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

describe('Number, String and Boolean as functions', () => {
  it('convert hook-free', () => {
    expect(run('return Number("12");')).toBe(12);
    expect(run('return Number("");')).toBe(0);
    expect(run('return Number(obj);', { obj: {} })).toBeNaN();
    expect(run('return Number(list);', { list: [5] })).toBe(5);
    expect(run('return Number();')).toBe(0);
    expect(run('return Number(null);')).toBe(0);
    expect(run('return String(123);')).toBe('123');
    expect(run('return String();')).toBe('');
    expect(run('return String(undefined);')).toBe('undefined');
    expect(run('return String(null);')).toBe('null');
    expect(run('return String(obj);', { obj: { toString: 1 } })).toBe('[object Object]');
    expect(run('return String(() => 1);')).toBe('[function]');
    expect(run('return Boolean("");')).toBe(false);
    expect(run('return Boolean(obj);', { obj: {} })).toBe(true);
    expect(run('return Boolean();')).toBe(false);
  });

  it('cannot be constructed', () => {
    expect(runAndCatch(maple, 'new String("x");').code).toBe('DISALLOWED_SYNTAX');
    expect(runAndCatch(maple, 'new Number(1);').code).toBe('DISALLOWED_SYNTAX');
  });

  it('expose their statics', () => {
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
    expect(run('return String.fromCharCode(72, 105);')).toBe('Hi');
    expect(run('return String.fromCodePoint(0x1f600);')).toBe('😀');
    expect(run('try { String.fromCodePoint(-1); } catch (e) { return e.name; }')).toBe(
      'RangeError'
    );
  });
});

describe('global functions', () => {
  it('parse and test numbers', () => {
    expect(run('return parseInt("42px");')).toBe(42);
    expect(run('return parseInt("ff", 16);')).toBe(255);
    expect(run('return parseInt("x");')).toBeNaN();
    expect(run('return parseFloat("1.5e2x");')).toBe(150);
    expect(run('return isNaN("x") && !isNaN("1");')).toBe(true);
    expect(run('return isFinite("1") && !isFinite("x");')).toBe(true);
    expect(run('return parseInt(list);', { list: ['7'] })).toBe(7);
  });

  it('encode and decode URIs', () => {
    expect(run('return encodeURIComponent("a b&c");')).toBe('a%20b%26c');
    expect(run('return decodeURIComponent("a%20b");')).toBe('a b');
    expect(run('return encodeURI("http://x/a b");')).toBe('http://x/a%20b');
    expect(run('return decodeURI("http://x/a%20b");')).toBe('http://x/a b');
    expect(
      run('try { decodeURIComponent("%"); } catch (e) { return [e.name, e instanceof Error]; }')
    ).toEqual(['URIError', true]);
  });

  it('are plain function values', () => {
    expect(run('return typeof parseInt;')).toBe('function');
    expect(run('const p = parseInt; return p("8");')).toBe(8);
    expect(run('return parseInt.length;')).toBeUndefined();
    expect(runAndCatch(maple, 'parseInt.x = 1;').sandboxError?.name).toBe('TypeError');
  });
});

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

describe('base64', () => {
  it('encodes and decodes Latin-1 text', () => {
    expect(run('return btoa("Maple");')).toBe('TWFwbGU=');
    expect(run('return atob("TWFwbGU=");')).toBe('Maple');
    expect(run('return atob(btoa("ä"));')).toBe('ä');
  });

  it('reports characters outside the alphabet as catchable errors', () => {
    expect(run('try { atob("*"); } catch (e) { return [e.name, e instanceof Error]; }')).toEqual([
      'InvalidCharacterError',
      true
    ]);
    expect(run('try { btoa("😀"); } catch (e) { return e.name; }')).toBe('InvalidCharacterError');
  });
});
