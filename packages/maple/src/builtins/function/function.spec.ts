import { describe, expect, it } from 'vitest';
import { intrinsic } from '../../boundary/host.ts';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple({
  globals: {
    sum: (...values: Array<number>): number => values.reduce((a, b) => a + b, 0),
    count: intrinsic((args) => args.length)
  }
});

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

function sandboxError(code: string): { name?: string; message?: string } | undefined {
  return runAndCatch(maple, code).sandboxError;
}

describe('Function.prototype.call', () => {
  it('calls script functions with the arguments after the receiver', () => {
    expect(run('function f(a, b) { return a + b; } return f.call(null, 1, 2);')).toBe(3);
    expect(run('return ((a) => a * 2).call(undefined, 4);')).toBe(8);
    expect(run('function f() { return arguments.length; } return f.call();')).toBe(0);
    expect(run('return (function () { return 1; }).call({ a: 1 });')).toBe(1);
  });

  it('passes the receiver to built-in methods', () => {
    expect(run('return "".trim.call("  b ");')).toBe('b');
    expect(run('const a = [1]; [].push.call(a, 2, 3); return a;')).toEqual([1, 2, 3]);
    expect(run('return Math.max.call(null, 1, 3, 2);')).toBe(3);
    expect(run('return [String.call(null, 5), Error.call(null, "m").message];')).toEqual([
      '5',
      'm'
    ]);
  });

  it('still checks the receiver of a built-in method', () => {
    expect(sandboxError('"".trim.call({});')).toMatchObject({
      name: 'TypeError',
      message: 'String.prototype.trim called on incompatible receiver [object Object]'
    });
    expect(sandboxError('[].push.call("x", 1);')?.name).toBe('TypeError');
    expect(sandboxError('Map.call();')).toMatchObject({
      name: 'TypeError',
      message: "Constructor Map requires 'new'"
    });
  });

  it('calls host functions and intrinsics', () => {
    expect(run('return sum.call(null, 1, 2);')).toBe(3);
    expect(run('return count.call(null, 1, 2, 3);')).toBe(3);
  });

  it('needs a function as its receiver', () => {
    expect(sandboxError('const c = (() => 1).call; c();')).toMatchObject({
      name: 'TypeError',
      message: 'Function.prototype.call called on incompatible receiver undefined'
    });
    expect(sandboxError('(() => 1).call.call(1);')?.name).toBe('TypeError');
    expect(run('function f(a) { return a; } return f.call.call(f, null, 1);')).toBe(1);
  });

  it('has the length of JavaScript', () => {
    expect(run('return [Math.max.call.length, Math.max.call.name];')).toEqual([1, 'call']);
  });
});

describe('Function.prototype.apply', () => {
  const collect = 'function f() { return [...arguments]; }';

  it('spreads an array-like into the arguments', () => {
    expect(run(`${collect} return f.apply(null, [1, 2]);`)).toEqual([1, 2]);
    expect(run(`${collect} return f.apply(null, [1, , 3]);`)).toEqual([1, undefined, 3]);
    expect(run(`${collect} return f.apply(null, { length: 2, 0: "a", 1: "b" });`)).toEqual([
      'a',
      'b'
    ]);
    expect(
      run(`${collect} function g() { return f.apply(null, arguments); } return g(1, 2);`)
    ).toEqual([1, 2]);
    expect(run(`${collect} return f.apply(null, (a, b) => 1);`)).toEqual([undefined, undefined]);
    expect(run(`${collect} return f.apply(null, new Map());`)).toEqual([]);
  });

  it('takes length as JavaScript converts it', () => {
    expect(run(`${collect} return f.apply(null, { length: -1 });`)).toEqual([]);
    expect(run(`${collect} return f.apply(null, { length: 2.7, 0: 1 });`)).toEqual([1, undefined]);
    expect(run(`${collect} return f.apply(null, { length: "1", 0: 1 });`)).toEqual([1]);
  });

  it('calls with no arguments for null and undefined', () => {
    expect(
      run(`${collect} return [f.apply(), f.apply(null, null), f.apply(null, undefined)];`)
    ).toEqual([[], [], []]);
  });

  it('refuses a primitive as the arguments', () => {
    expect(sandboxError('(() => 1).apply(null, 1);')).toMatchObject({
      name: 'TypeError',
      message: 'CreateListFromArrayLike called on non-object'
    });
    expect(sandboxError('(() => 1).apply(null, "ab");')?.name).toBe('TypeError');
  });

  it('passes the receiver to built-in methods and calls everything else', () => {
    expect(run('return Math.max.apply(null, [1, 3, 2]);')).toBe(3);
    expect(run('return "a-b".split.apply("x-y", ["-"]);')).toEqual(['x', 'y']);
    expect(sandboxError('[].push.apply({}, [1]);')?.name).toBe('TypeError');
    expect(run('return [sum.apply(null, [1, 2]), count.apply(null, [1, 2])];')).toEqual([3, 2]);
  });

  it('charges the arguments before it builds them', () => {
    const bounded = new Maple({ maxOps: 1000 });

    expect(runAndCatch(bounded, '(() => 1).apply(null, { length: 1e9 });').code).toBe(
      'LIMIT_EXCEEDED'
    );
    const ops = (code: string): number => bounded.run(code).stats.ops;
    expect(
      ops('(() => 1).apply(null, { length: 100 });') - ops('(() => 1).apply(null, { length: 0 });')
    ).toBe(100);
  });

  it('has the length of JavaScript', () => {
    expect(run('return [Math.max.apply.length, Math.max.apply.name];')).toEqual([2, 'apply']);
  });
});

describe('Function.prototype.bind', () => {
  it('fixes leading arguments', () => {
    expect(run('function f(a, b) { return a + b; } return f.bind(null, 1)(2);')).toBe(3);
    expect(run('function f(a, b) { return [a, b]; } return f.bind()(1, 2);')).toEqual([1, 2]);
    expect(run('function f(...a) { return a; } return f.bind(null, 1).bind(null, 2)(3);')).toEqual([
      1, 2, 3
    ]);
    expect(
      run('const atLeast2 = Math.max.bind(null, 2); return [atLeast2(1), atLeast2(5)];')
    ).toEqual([2, 5]);
  });

  it('names a bound function after its target and leaves the rest of its length', () => {
    expect(
      run('function f(a, b, c) {} const b = f.bind(null, 1); return [b.name, b.length];')
    ).toEqual(['bound f', 2]);
    expect(run('return [(() => 1).bind().name, (() => 1).bind(null, 1, 2).length];')).toEqual([
      'bound ',
      0
    ]);
    expect(run('function f(a, b) {} return f.bind().bind().name;')).toBe('bound bound f');
    expect(run('return [Math.max.bind().name, Math.max.bind().length];')).toEqual(['bound max', 2]);
    expect(run('return [String.bind().name, "".trim.bind().name];')).toEqual([
      'bound String',
      'bound trim'
    ]);
    expect(run('return Object.getOwnPropertyNames((() => 1).bind());')).toEqual(['length', 'name']);
  });

  it('shows no properties for a bound host function', () => {
    expect(run('const b = sum.bind(null, 1); return [b.name, b.length, Object.keys(b)];')).toEqual([
      undefined,
      undefined,
      []
    ]);
    expect(run('return [sum.bind(null, 1)(2), count.bind(null, 1)(2, 3)];')).toEqual([3, 3]);
  });

  it('passes the bound receiver to a built-in method, which checks it', () => {
    expect(run('return "".trim.bind("  b ")();')).toBe('b');
    expect(run('const a = []; const push = [].push.bind(a); push(1); push(2); return a;')).toEqual([
      1, 2
    ]);
    expect(sandboxError('[].push.bind({})(1);')).toMatchObject({
      name: 'TypeError',
      message: 'Array.prototype.push called on incompatible receiver [object Object]'
    });
  });

  it('is a function that takes properties and freezes', () => {
    expect(run('return typeof (() => 1).bind();')).toBe('function');
    expect(run('return String((() => 1).bind());')).toBe('[function]');
    expect(
      run(
        'const b = (() => 1).bind(); b.x = 1; Object.freeze(b); return [b.x, Object.isFrozen(b)];'
      )
    ).toEqual([1, true]);
    expect(sandboxError('const b = (() => 1).bind(); Object.freeze(b); b.x = 1;')?.name).toBe(
      'TypeError'
    );
    expect(sandboxError('(() => 1).bind().name = "x";')?.name).toBe('TypeError');
  });

  it('cannot be constructed or used with instanceof', () => {
    expect(runAndCatch(maple, 'const B = Error.bind(null, "x"); new B();').code).toBe(
      'DISALLOWED_SYNTAX'
    );
    expect(sandboxError('({}) instanceof (() => 1).bind();')).toMatchObject({
      name: 'TypeError',
      message: "Right-hand side of 'instanceof' is not a constructor"
    });
  });

  it('needs a function as its receiver', () => {
    expect(sandboxError('const b = (() => 1).bind; b();')).toMatchObject({
      name: 'TypeError',
      message: 'Function.prototype.bind called on incompatible receiver undefined'
    });
  });

  it('keeps the name of the target in the stack', () => {
    expect(
      run('function f() { return new Error("e").stack; } return f.bind()().split("\\n")[1];')
    ).toMatch(/^ {4}at f /);
  });

  it('has the length of JavaScript', () => {
    expect(run('return [Math.max.bind.length, Math.max.bind.name];')).toEqual([1, 'bind']);
  });
});

describe('calls through call, apply and bind', () => {
  it('count toward maxDepth like the calls they make', () => {
    const shallow = new Maple({ maxDepth: 10 });

    expect(
      shallow.run('function f(n) { return n && f.call(null, n - 1); } return f(9);').stats.maxDepth
    ).toBe(10);
    expect(runAndCatch(shallow, 'function f(n) { return f.apply(null, [n]); } f(1);').code).toBe(
      'LIMIT_EXCEEDED'
    );
    expect(runAndCatch(shallow, 'function f() { return g(); } const g = f.bind(); f();').code).toBe(
      'LIMIT_EXCEEDED'
    );
  });

  it('count a level for each built-in that one built-in calls', () => {
    const shallow = new Maple({ maxDepth: 10 });

    expect(shallow.run('return Math.max.call(null, 1);').stats.maxDepth).toBe(1);
    expect(
      runAndCatch(
        shallow,
        'const ap = (() => 1).apply; const a = [ap, null]; a[1] = a; ap.apply(ap, a);'
      ).code
    ).toBe('LIMIT_EXCEEDED');
  });
});
