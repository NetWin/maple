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

describe('object literals', () => {
  it('build plain objects from every property form', () => {
    expect(run('return { a: 1, "b": "x", 3: true };')).toEqual({ a: 1, b: 'x', 3: true });
    expect(run('const a = 1; return { a };')).toEqual({ a: 1 });
    expect(run('const k = "dyn"; return { [k + "amic"]: 1 };')).toEqual({ dynamic: 1 });
    expect(run('return { f() { return 1; } }.f();')).toBe(1);
    expect(run('return { a: { b: [1] } };')).toEqual({ a: { b: [1] } });
    expect(run('return { a: 1, a: 2 };')).toEqual({ a: 2 });
  });

  it('spread own enumerable entries and let later keys win', () => {
    expect(run('return { ...obj, c: 3 };', { obj: { a: 1, b: 2 } })).toEqual({ a: 1, b: 2, c: 3 });
    expect(run('return { a: 0, ...obj };', { obj: { a: 1 } })).toEqual({ a: 1 });
    expect(run('return { ...[7, 8] };')).toEqual({ 0: 7, 1: 8 });
    expect(run('return { ..."ab" };')).toEqual({ 0: 'a', 1: 'b' });
    expect(run('return { ...null, ...undefined, ...5, ...(() => 1) };')).toEqual({});
  });

  it('produce ordinary objects that cannot touch host prototypes', () => {
    const value = run('return { a: 1 };');

    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(Object.isFrozen(value)).toBe(false);
  });

  it('reject forbidden keys, static or computed', () => {
    expect(sandboxError('return { __proto__: {} };')).toMatchObject({
      name: 'TypeError',
      message: "Access to '__proto__' is not allowed"
    });
    expect(sandboxError('return { ["__pro" + "to__"]: 1 };')?.name).toBe('TypeError');
    expect(sandboxError('return { constructor: 1 };')?.name).toBe('TypeError');
    expect(sandboxError('return { prototype: 1 };')?.name).toBe('TypeError');
    expect('polluted' in {}).toBe(false);
  });

  it('reject getters and setters', () => {
    expect(runAndCatch(maple, 'return { get a() { return 1; } };').message).toBe(
      'getters and setters are not supported'
    );
  });
});

describe('array literals', () => {
  it('build arrays with holes read as undefined', () => {
    expect(run('return [1, "a", [2]];')).toEqual([1, 'a', [2]]);
    expect(run('return [1, , 3];')).toEqual([1, undefined, 3]);
    expect(run('return [1, , 3].length;')).toBe(3);
    expect(run('const a = [1, , 3]; return [0 in a, 1 in a, Object.keys(a)];')).toEqual([
      true,
      false,
      ['0', '2']
    ]);
  });

  it('spread iterables', () => {
    expect(run('return [0, ...list, 4];', { list: [1, 2] })).toEqual([0, 1, 2, 4]);
    expect(run('return [..."ab"];')).toEqual(['a', 'b']);
    expect(sandboxError('return [...obj];', { obj: {} })).toMatchObject({
      name: 'TypeError',
      message: 'obj is not iterable'
    });
  });
});

describe('member access', () => {
  const data = { obj: { a: { b: 2 }, n: 1 }, list: ['x', 'y'], key: 'n' };

  it('reads own properties by dot, bracket and coerced key', () => {
    expect(run('return obj.n;', data)).toBe(1);
    expect(run('return obj["n"];', data)).toBe(1);
    expect(run('return obj[key];', data)).toBe(1);
    expect(run('return obj.a.b;', data)).toBe(2);
    expect(run('return list[0];', data)).toBe('x');
    expect(run('return list["1"];', data)).toBe('y');
    expect(run('return list.length;', data)).toBe(2);
    expect(run('return obj.missing;', data)).toBeUndefined();
    expect(run('return list[5];', data)).toBeUndefined();
    expect(run('return ({ 1: "one" })[1];')).toBe('one');
    expect(run('return ({ "[object Object]": "o" })[{}];')).toBe('o');
  });

  it('reads string length and characters', () => {
    expect(run('return "abc".length;')).toBe(3);
    expect(run('return "abc"[1];')).toBe('b');
    expect(run('return "abc"["1"];')).toBe('b');
    expect(run('return "abc"["01"];')).toBeUndefined();
    expect(run('return "abc"[3];')).toBeUndefined();
  });

  it('sees only methods on numbers and booleans, and length and name on functions', () => {
    expect(run('return (5).foo;')).toBeUndefined();
    expect(run('return true.foo;')).toBeUndefined();
    expect(run('const f = (a, b) => 1; return [f.length, f.name];')).toEqual([2, 'f']);
    expect(run('const f = () => 1; return f.call;')).toBeUndefined();
  });

  it('never reaches a prototype, only the dispatch tables', () => {
    expect(run('return [typeof obj.toString, obj.toString()];', data)).toEqual([
      'function',
      '[object Object]'
    ]);
    expect(run('return obj.valueOf() === obj;', data)).toBe(true);
    expect(run('return obj.isPrototypeOf;', data)).toBeUndefined();
    expect(run('return list.foo;', data)).toBeUndefined();
    expect(run('return typeof list.map;', data)).toBe('function');
    expect(run('return typeof obj.hasOwnProperty;', data)).toBe('function');
  });

  it('rejects the forbidden keys on every kind of value', () => {
    const message = "Access to 'constructor' is not allowed";

    expect(sandboxError('return obj.constructor;', data)?.message).toBe(message);
    expect(sandboxError('return list.constructor;', data)?.message).toBe(message);
    expect(sandboxError('return "a".constructor;')?.message).toBe(message);
    expect(sandboxError('return (() => 1).constructor;')?.message).toBe(message);
    expect(sandboxError('return (1).constructor;')?.message).toBe(message);
    expect(sandboxError('return obj.__proto__;', data)?.name).toBe('TypeError');
    expect(sandboxError('return obj["__pro" + "to__"];', data)?.name).toBe('TypeError');
    expect(sandboxError('return (() => 1).prototype;')?.name).toBe('TypeError');
    expect(sandboxError('return own.__proto__;', '{"own": {"__proto__": 1}}')?.name).toBe(
      'TypeError'
    );
  });

  it('throws when reading from null or undefined', () => {
    expect(sandboxError('return obj.missing.deeper;', data)).toMatchObject({
      name: 'TypeError',
      message: "Cannot read properties of undefined (reading 'deeper')"
    });
    expect(sandboxError('return nothing.a;', { nothing: null })?.message).toBe(
      "Cannot read properties of null (reading 'a')"
    );
  });
});

describe('member writes', () => {
  it('create and update own properties of script objects', () => {
    expect(run('const o = {}; o.a = 1; o["b"] = 2; return o;')).toEqual({ a: 1, b: 2 });
    expect(run('const o = { n: 1 }; o.n += 2; o.n++; return o.n;')).toBe(4);
    expect(run('const o = { n: 1 }; return o.n++;')).toBe(1);
    expect(run('const o = {}; return o.a = 5;')).toBe(5);
    expect(run('const o = { a: 0 }; o.a ||= 3; return o.a;')).toBe(3);
  });

  it('writes array elements and length', () => {
    expect(run('const l = [1, 2]; l[0] = 9; return l;')).toEqual([9, 2]);
    expect(run('const l = [1]; l[2] = 3; return l;')).toEqual([1, undefined, 3]);
    expect(run('const l = [1, 2, 3]; l.length = 1; return l;')).toEqual([1]);
    expect(sandboxError('const l = []; l.length = -1;')).toMatchObject({
      name: 'RangeError',
      message: 'Invalid array length'
    });
  });

  it('rejects writes to input data at any depth', () => {
    const data = { obj: { a: { b: 1 } }, list: [1] };

    expect(sandboxError('obj.a = 1;', data)).toMatchObject({
      name: 'TypeError',
      message: "Cannot assign to read-only property 'a'"
    });
    expect(sandboxError('obj.a.b = 2;', data)?.name).toBe('TypeError');
    expect(sandboxError('obj.fresh = 2;', data)?.name).toBe('TypeError');
    expect(sandboxError('list[0] = 2;', data)?.name).toBe('TypeError');
    expect(sandboxError('list.length = 0;', data)?.name).toBe('TypeError');
    expect(sandboxError('obj.a.b++;', data)?.name).toBe('TypeError');
  });

  it('rejects writes to primitives, read-only properties, nullish values and forbidden keys', () => {
    expect(sandboxError('"abc".x = 1;')).toMatchObject({
      name: 'TypeError',
      message: "Cannot create property 'x' on string"
    });
    expect(sandboxError('const f = Math.max; f.name = "min";')?.message).toBe(
      "Cannot assign to read-only property 'name' of a Function"
    );
    expect(sandboxError('undefined.a = 1;')).toMatchObject({
      name: 'TypeError',
      message: "Cannot set properties of undefined (setting 'a')"
    });
    expect(sandboxError('const o = {}; o.__proto__ = {};')?.name).toBe('TypeError');
    expect(sandboxError('const o = {}; o["constructor"] = 1;')?.name).toBe('TypeError');
    expect('polluted' in {}).toBe(false);
  });
});

describe('delete and in', () => {
  it('deletes own properties of script objects', () => {
    expect(run('const o = { a: 1, b: 2 }; const r = delete o.a; return [r, o];')).toEqual([
      true,
      { b: 2 }
    ]);
    expect(run('const o = {}; return delete o.missing;')).toBe(true);
    expect(run('const l = [1, 2]; delete l[0]; return [l.length, l[0]];')).toEqual([2, undefined]);
  });

  it('rejects deleting from input, nullish values and forbidden keys', () => {
    expect(sandboxError('delete obj.a;', { obj: { a: 1 } })).toMatchObject({
      name: 'TypeError',
      message: "Cannot delete property 'a' of #<Object>"
    });
    expect(sandboxError('delete undefined.a;')?.name).toBe('TypeError');
    expect(sandboxError('const o = {}; delete o.__proto__;')?.name).toBe('TypeError');
  });

  it('answers in with own properties and methods', () => {
    const data = { obj: { a: 1 }, list: [1] };

    expect(run('return "a" in obj;', data)).toBe(true);
    expect(run('return "z" in obj;', data)).toBe(false);
    expect(run('return "toString" in obj;', data)).toBe(true);
    expect(run('return 0 in list && "length" in list;', data)).toBe(true);
    expect(run('return "map" in list;', data)).toBe(true);
    expect(run('return "x" in (() => 1);')).toBe(false);
    expect(run('return "toString" in (() => 1);')).toBe(true);
    expect(run('return "call" in (() => 1);')).toBe(false);
    expect(run('return "__proto__" in obj;', data)).toBe(false);
    expect(run('return "__proto__" in own;', '{"own": {"__proto__": 1}}')).toBe(true);
    expect(sandboxError('return "a" in 5;')).toMatchObject({
      name: 'TypeError',
      message: "Cannot use 'in' operator to search for 'a' in 5"
    });
  });
});

describe('optional chaining', () => {
  const data = { obj: { a: { b: 1 }, f: null }, nothing: null };

  it('short-circuits the rest of the chain on null or undefined', () => {
    expect(run('return obj?.a;', data)).toEqual({ b: 1 });
    expect(run('return nothing?.a;', data)).toBeUndefined();
    expect(run('return obj.missing?.deeper.evenDeeper;', data)).toBeUndefined();
    expect(run('return obj?.["a"]?.b;', data)).toBe(1);
    expect(run('return nothing?.a.b.c;', data)).toBeUndefined();
  });

  it('applies to calls', () => {
    expect(run('return obj.f?.();', data)).toBeUndefined();
    expect(run('return obj.missing?.();', data)).toBeUndefined();
    expect(run('return nothing?.f();', data)).toBeUndefined();
    expect(run('const o = { f: () => 2 }; return o.f?.();')).toBe(2);
    expect(run('const f = null; return f?.(1);')).toBeUndefined();
  });

  it('stops at parentheses, as JavaScript does', () => {
    expect(sandboxError('return (nothing?.a).b;', data)?.name).toBe('TypeError');
  });
});

describe('method calls', () => {
  it('call closures stored in objects, without this', () => {
    expect(run('const o = { f: (x) => x + 1 }; return o.f(1);')).toBe(2);
    expect(run('const o = { f() { return 3; } }; return o["f"]();')).toBe(3);
    expect(run('const o = { a: { f: () => 4 } }; return o.a.f();')).toBe(4);
  });

  it('report missing or non-callable members with the member path', () => {
    expect(sandboxError('const o = {}; o.g();')).toMatchObject({
      name: 'TypeError',
      message: 'o.g is not a function'
    });
    expect(sandboxError('const o = { a: 1 }; o.a();')?.message).toBe('o.a is not a function');
    expect(sandboxError('list.foo((x) => x);', { list: [] })?.message).toBe(
      'list.foo is not a function'
    );
  });
});

describe('call error messages', () => {
  it('describe the callee as written', () => {
    expect(sandboxError('"a".missing();')?.message).toBe('"a".missing is not a function');
    expect(sandboxError("'a'.foo();")?.message).toBe("'a'.foo is not a function");
    expect(sandboxError('(5).foo();')?.message).toBe('5.foo is not a function');
    expect(sandboxError('/x/.foo();')?.message).toBe('/x/.foo is not a function');
    expect(sandboxError('const o = { a: {} }; o.a.f();')?.message).toBe('o.a.f is not a function');
    expect(sandboxError('const f = () => ({}); f().g();')?.message).toBe(
      'f(...).g is not a function'
    );
    expect(sandboxError('[1].foo();')?.message).toBe('[...].foo is not a function');
    expect(sandboxError('({}).foo();')?.message).toBe('{...}.foo is not a function');
    expect(sandboxError('const o = {}; o["x y"]();')?.message).toBe('o["x y"] is not a function');
    expect(sandboxError('(() => 1)()();')?.message).toBe('value(...) is not a function');
    expect(sandboxError('const o = {}; const k = "f"; o[k]();')?.message).toBe(
      'o[k] is not a function'
    );
  });
});

describe('spread arguments', () => {
  it('expand iterables into positional arguments', () => {
    expect(run('const f = (...r) => r; return f(0, ...list, 3);', { list: [1, 2] })).toEqual([
      0, 1, 2, 3
    ]);
    expect(run('const f = (a, b) => a + b; return f(..."ab");')).toBe('ab');
    expect(sandboxError('const f = () => 1; f(...5);')?.message).toBe('5 is not iterable');
  });
});

describe('operations', () => {
  it('count literals and member expressions', () => {
    expect(maple.run('return {};').stats.ops).toBe(2);
    expect(maple.run('return [1];').stats.ops).toBe(3);
    expect(maple.run('return obj.a;', { obj: { a: 1 } }).stats.ops).toBe(3);
  });
});
