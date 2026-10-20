import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

// js-interpreter's `arguments` is a real array and it turns a function into '[object Function]'
// instead of its source, both unlike ES5; the tests only rely on what ES5 and both engines agree on.

describe('syntax:FunctionDeclaration', () => {
  it('is hoisted', () => {
    expect(parity('var r = early(); function early() { return "hoisted"; } return r;')).toBe(
      'hoisted'
    );
  });

  it('is hoisted inside its function', () => {
    expect(
      parity('function outer() { return inner(); function inner() { return 1; } } return outer();')
    ).toBe(1);
  });

  it('returns undefined without a return', () => {
    expect(parity('function nothing() {} return [nothing(), typeof nothing()];')).toStrictEqual([
      undefined,
      'undefined'
    ]);
  });

  it('returns early', () => {
    expect(
      parity('function early(n) { if (n) { return; } return "late"; } return [early(1), early(0)];')
    ).toStrictEqual([undefined, 'late']);
  });

  it('leaves missing parameters undefined', () => {
    expect(
      parity('function f(a, b) { return [a, b === undefined, typeof b]; } return f(1);')
    ).toStrictEqual([1, true, 'undefined']);
  });

  it('ignores extra arguments', () => {
    expect(parity('function f(a) { return a; } return f(1, 2, 3);')).toBe(1);
  });

  it('copies primitive arguments', () => {
    expect(
      parity('function f(n) { n = n + 1; return n; } var x = 1; return [f(x), x];')
    ).toStrictEqual([2, 1]);
  });

  it('shares objects passed as arguments', () => {
    expect(
      parity('function f(o) { o.touched = true; } var obj = {}; f(obj); return obj;')
    ).toStrictEqual({ touched: true });
  });

  it('shadows an outer variable with a parameter', () => {
    expect(
      parity('var x = "outer"; function f(x) { return x; } return [f("inner"), x];')
    ).toStrictEqual(['inner', 'outer']);
  });

  it('recurses', () => {
    expect(
      parity('function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); } return fib(15);')
    ).toBe(610);
  });

  it('recurses mutually', () => {
    expect(
      parity(
        'function isEven(n) { return n === 0 ? true : isOdd(n - 1); } function isOdd(n) { return n === 0 ? false : isEven(n - 1); } return [isEven(10), isOdd(7)];'
      )
    ).toStrictEqual([true, true]);
  });

  it('compares by identity', () => {
    expect(
      parity(
        'function f() {} var g = f; var h = function () {}; return [f === g, f === h, f == g];'
      )
    ).toStrictEqual([true, false, true]);
  });
});

describe('syntax:FunctionExpression', () => {
  it('is invoked immediately', () => {
    expect(parity('return (function (a) { return a * 2; })(21);')).toBe(42);
  });

  it('keeps a private variable in an immediately invoked function', () => {
    expect(
      parity(
        'var counter = (function () { var n = 0; return { next: function () { n++; return n; } }; })(); counter.next(); return counter.next();'
      )
    ).toBe(2);
  });

  it('closes over a variable', () => {
    expect(
      parity(
        'function make() { var secret = 42; return function () { return secret; }; } return make()();'
      )
    ).toBe(42);
  });

  it('keeps state in a closure', () => {
    expect(
      parity(
        'function counter() { var n = 0; return function () { return ++n; }; } var c = counter(); c(); c(); return c();'
      )
    ).toBe(3);
  });

  it('keeps separate state per closure', () => {
    expect(
      parity(
        'function counter() { var n = 0; return function () { return ++n; }; } var a = counter(), b = counter(); a(); a(); return [a(), b()];'
      )
    ).toStrictEqual([3, 1]);
  });

  it('shares a loop var between closures', () => {
    expect(
      parity(
        'var fns = []; for (var i = 0; i < 3; i++) { fns.push(function () { return i; }); } return [fns[0](), fns[2]()];'
      )
    ).toStrictEqual([3, 3]);
  });

  it('captures loop values through a factory', () => {
    expect(
      parity(
        'function bindValue(v) { return function () { return v; }; } var fns = []; for (var i = 0; i < 3; i++) { fns.push(bindValue(i)); } return [fns[0](), fns[2]()];'
      )
    ).toStrictEqual([0, 2]);
  });

  it('sees later assignments', () => {
    expect(parity('var v = 1; var read = function () { return v; }; v = 2; return read();')).toBe(
      2
    );
  });

  it('is passed as a callback', () => {
    expect(
      parity(
        'function apply(fn, v) { return fn(v); } return apply(function (x) { return x + 1; }, 1);'
      )
    ).toBe(2);
  });

  it('is returned from a function', () => {
    expect(
      parity('function adder(a) { return function (b) { return a + b; }; } return adder(3)(4);')
    ).toBe(7);
  });

  it('is passed to a built-in', () => {
    expect(parity('return [3, 1, 2].map(function (n) { return n * 10; });')).toStrictEqual([
      30, 10, 20
    ]);
  });

  it('is stored on an object and called as a method', () => {
    expect(
      parity('var o = { greet: function (who) { return "hi " + who; } }; return o.greet("you");')
    ).toBe('hi you');
  });

  it('is stored in an array', () => {
    expect(
      parity(
        'var ops = [function (a) { return a + 1; }, function (a) { return a * 2; }]; return [ops[0](5), ops[1](5)];'
      )
    ).toStrictEqual([6, 10]);
  });

  it('throws when a missing method is called', () => {
    expect(allThrow('var o = {}; return o.missing();')).toBe('TypeError');
  });
});

describe('syntax:FunctionExpression:named', () => {
  it('keeps its name out of the enclosing scope', () => {
    expect(parity('var g = function hidden() { return 1; }; return typeof hidden;')).toBe(
      'undefined'
    );
  });

  it('recurses through its own name', () => {
    expect(
      parity(
        'var countdown = function down(n) { return n === 0 ? "done" : down(n - 1); }; return countdown(3);'
      )
    ).toBe('done');
  });
});

describe('instance:arguments.length', () => {
  it('counts the arguments passed', () => {
    expect(
      parity(
        'function count() { return arguments.length; } return [count(), count(1), count(1, 2, 3)];'
      )
    ).toStrictEqual([0, 1, 3]);
  });

  it('iterates the arguments with a for loop', () => {
    expect(
      parity(
        'function sum() { var s = 0; for (var i = 0; i < arguments.length; i++) { s += arguments[i]; } return s; } return sum(1, 2, 3, 4);'
      )
    ).toBe(10);
  });

  it('counts extra arguments beside named parameters', () => {
    expect(
      parity(
        'function f(a, b) { return [a, b, arguments.length, arguments[2]]; } return f(1, 2, 3);'
      )
    ).toStrictEqual([1, 2, 3, 3]);
  });

  it('counts fewer arguments than parameters', () => {
    expect(
      parity('function f(a, b, c) { return [arguments.length, c]; } return f(1);')
    ).toStrictEqual([1, undefined]);
  });

  it('belongs to each function separately', () => {
    expect(
      parity(
        'function outer() { function inner() { return arguments.length; } return [arguments.length, inner(1)]; } return outer(1, 2, 3);'
      )
    ).toStrictEqual([3, 1]);
  });

  it('works in a function expression', () => {
    expect(
      parity(
        'var join = function () { var out = ""; for (var i = 0; i < arguments.length; i++) { out += arguments[i]; } return out; }; return join("a", "b");'
      )
    ).toBe('ab');
  });

  it('reads arguments by index', () => {
    expect(
      parity(
        'function pick() { return [arguments[0], arguments[2], arguments[5], arguments.length]; } return pick("a", "b", "c");'
      )
    ).toStrictEqual(['a', 'c', undefined, 3]);
  });

  it('is an object', () => {
    expect(
      parity('function f() { return [typeof arguments, arguments.length]; } return f();')
    ).toStrictEqual(['object', 0]);
  });

  it('is not mapped to parameters in strict mode', () => {
    expect(
      parity(
        'function f(a) { a = 9; var fromParam = arguments[0]; arguments[0] = 7; return [fromParam, a, arguments[0], arguments.length]; } return f(1);'
      )
    ).toStrictEqual([1, 9, 7, 1]);
  });

  it('is captured by a closure', () => {
    expect(
      parity(
        'function first() { var args = arguments; return function () { return [args[0], args.length]; }; } return first("kept")();'
      )
    ).toStrictEqual(['kept', 1]);
  });

  it('lists its indices in for in', () => {
    expect(
      parity(
        'function f() { var s = 0; for (var k in arguments) { s += arguments[k]; } return [s, arguments.length]; } return f(1, 2, 3);'
      )
    ).toStrictEqual([6, 3]);
  });

  it('has its indices as keys', () => {
    expect(
      parity(
        'function f() { return [Object.keys(arguments), arguments.length]; } return f("x", "y");'
      )
    ).toStrictEqual([['0', '1'], 2]);
  });
});

describe('instance:function.length', () => {
  it('counts declared parameters', () => {
    expect(
      parity(
        'function none() {} function two(a, b) {} var three = function (a, b, c) {}; return [none.length, two.length, three.length];'
      )
    ).toStrictEqual([0, 2, 3]);
  });
});

describe('length and name of built-in functions', () => {
  it('are the ones JavaScript gives them', () => {
    expect(
      parity(
        'return [parseInt.length, Math.max.length, "".charAt.length, [].push.length, Date.UTC.length];'
      )
    ).toStrictEqual([
      parseInt.length,
      Math.max.length,
      ''.charAt.length,
      [].push.length,
      Date.UTC.length
    ]);
  });

  it('name built-in functions', () => {
    expect(parity('return [parseInt.name, Math.max.name, "".charAt.name];')).toStrictEqual([
      parseInt.name,
      Math.max.name,
      ''.charAt.name
    ]);
  });
});

describe('instance:function.name', () => {
  it('names a declaration', () => {
    expect(parity('function declared() {} return declared.name;')).toBe('declared');
  });

  it('names a named expression', () => {
    expect(parity('var g = function named(a) {}; return g.name;')).toBe('named');
  });

  it('is inferred from a variable', () => {
    expect(parity('var inferred = function () {}; return inferred.name;')).toBe('inferred');
  });

  it('is inferred from a property', () => {
    expect(parity('var o = { method: function () {} }; return o.method.name;')).toBe('method');
  });
});

describe('Function.prototype.toString', () => {
  it('returns a string for a script function', () => {
    expect(parity('function add(a, b) { return a + b; } return typeof add.toString();')).toBe(
      'string'
    );
  });

  it('returns a string for a built-in function', () => {
    expect(parity('return typeof Math.max.toString();')).toBe('string');
  });
});

describe('Function.prototype.valueOf', () => {
  it('returns the function itself', () => {
    expect(parity('function f() {} return f.valueOf() === f;')).toBe(true);
  });

  it('returns a built-in function itself', () => {
    expect(parity('return parseInt.valueOf() === parseInt;')).toBe(true);
  });
});

describe('Function.prototype.call', () => {
  it('calls a script function with the arguments after the receiver', () => {
    expect(parity('function f(a, b) { return a + b; } return f.call(null, 1, 2);')).toBe(3);
  });

  it('passes the receiver to a built-in method', () => {
    expect(parity("return ''.trim.call('  b ');")).toBe('b');
    expect(parity('var a = [1]; [].push.call(a, 2, 3); return a;')).toEqual([1, 2, 3]);
  });

  it('calls a global function', () => {
    expect(parity('return [String.call(null, 5), Math.max.call(null, 1, 3, 2)];')).toEqual([
      '5',
      3
    ]);
  });

  it('calls call itself', () => {
    expect(parity('function f(a) { return a; } return f.call.call(f, null, 1);')).toBe(1);
  });

  it('needs a function as its receiver', () => {
    expect(allThrow('var c = Math.max.call; return c();')).toBe('TypeError');
  });
});

// js-interpreter throws for `f.apply(null, null)`, so the case for no arguments is in Maple's own spec
describe('Function.prototype.apply', () => {
  it('spreads an array into the arguments', () => {
    expect(parity('function f(a, b) { return a + b; } return f.apply(null, [1, 2]);')).toBe(3);
    expect(parity('return Math.max.apply(null, [1, 3, 2]);')).toBe(3);
  });

  it('spreads an array-like and arguments', () => {
    expect(
      parity(
        "function f(a, b) { return a + b; } return f.apply(null, { length: 2, 0: 'a', 1: 'b' });"
      )
    ).toBe('ab');
    expect(
      parity(
        'function f(a, b) { return a + b; } function g() { return f.apply(null, arguments); } return g(1, 2);'
      )
    ).toBe(3);
  });

  it('passes the receiver to a built-in method', () => {
    expect(parity("return 'a-b'.split.apply('x-y', ['-']);")).toEqual(['x', 'y']);
  });
});

// js-interpreter throws for `f.bind()` without a receiver, so every case passes one
describe('Function.prototype.bind', () => {
  it('fixes leading arguments', () => {
    expect(parity('function f(a, b) { return a + b; } return f.bind(null, 1)(2);')).toBe(3);
    expect(
      parity('function f(a, b, c) { return [a, b, c]; } return f.bind(null, 1).bind(null, 2)(3);')
    ).toEqual([1, 2, 3]);
  });

  it('binds the receiver of a built-in method', () => {
    expect(parity("var trim = ''.trim.bind('  b '); return trim();")).toBe('b');
    expect(parity('var a = []; var push = [].push.bind(a); push(1); push(2); return a;')).toEqual([
      1, 2
    ]);
  });

  it('gives a function', () => {
    expect(parity('function f() {} return typeof f.bind(null);')).toBe('function');
  });
});

describe('method calls', () => {
  it('read the same function for every value of a type', () => {
    expect(
      parity(
        'var a = [], b = []; return [a.push === a.push, a.push === b.push, "x".trim === "y".trim, (1).toFixed === (2).toFixed, [[].push].indexOf([].push)];'
      )
    ).toEqual([true, true, true, true, 0]);
  });

  it('take the receiver from the member they are called on', () => {
    expect(parity('var a = []; a.push(1); a["push"](2); (a.push)(3); return a;')).toEqual([
      1, 2, 3
    ]);
  });

  it('throw when a string method is called without its string', () => {
    expect(allThrow('var t = " a ".trim; t();')).toBe('TypeError');
  });
});

describe('syntax:ThisExpression', () => {
  it('is the object a function is called on', () => {
    expect(parity('var o = { n: 1, f: function () { return this.n; } }; return o.f();')).toBe(1);
    expect(parity('var o = { n: 1, f: function () { return this.n; } }; return o["f"]();')).toBe(1);
    expect(parity('var o = { n: 1, f: function () { return this.n; } }; return (o.f)();')).toBe(1);
  });

  it('is undefined for a plain call', () => {
    expect(parity('function f() { return typeof this; } return f();')).toBe('undefined');
    expect(parity('var o = { f: function () { return typeof this; } }; return (0, o.f)();')).toBe(
      'undefined'
    );
    expect(
      parity('var o = { f: function () { return typeof this; } }; var g = o.f; return g();')
    ).toBe('undefined');
    expect(parity('return typeof this;')).toBe('undefined');
  });

  it('is what call, apply and bind pass, unboxed', () => {
    expect(
      parity(
        'function f() { return this; } return [f.call(5), f.apply("s", []), f.bind(true)(), f.call(null)];'
      )
    ).toEqual([5, 's', true, null]);
    expect(parity('function f() { return typeof this; } return f.call(5);')).toBe('number');
  });

  it('keeps the bound receiver', () => {
    expect(parity('function f() { return this; } return f.bind(1).call(2);')).toBe(1);
    expect(parity('function f() { return this; } var o = { g: f.bind(1) }; return o.g();')).toBe(1);
  });

  it('is undefined again in a nested function', () => {
    expect(
      parity(
        'var o = { f: function () { function g() { return typeof this; } return g(); } }; return o.f();'
      )
    ).toBe('undefined');
  });

  it('lets a method return its object for chaining', () => {
    expect(
      parity(
        'var o = { n: 0, add: function (k) { this.n += k; return this; } }; return o.add(1).add(2).n;'
      )
    ).toBe(3);
  });

  it('is read and written like any object', () => {
    expect(
      parity('var o = { f: function () { this.x = 1; return this.x; } }; return [o.f(), o.x];')
    ).toEqual([1, 1]);
    expect(allThrow('function f() { return this.x; } return f();')).toBe('TypeError');
  });
});

describe('thisArg of array callbacks', () => {
  it('is this in the callback', () => {
    expect(
      parity(
        'var t = { k: 10 }; var seen = []; var f = function (x) { seen.push(this.k + x); return true; }; [1].every(f, t); [1].filter(f, t); [1].forEach(f, t); [1].map(f, t); [1].some(f, t); return seen;'
      )
    ).toEqual([11, 11, 11, 11, 11]);
  });

  it('passes a primitive unboxed', () => {
    expect(parity('return [1].map(function () { return typeof this; }, 5);')).toEqual(['number']);
  });

  it('leaves this undefined when omitted', () => {
    expect(parity('return [1].map(function () { return typeof this; });')).toEqual(['undefined']);
  });
});

describe('assign:function property', () => {
  it('adds a property to a script function', () => {
    expect(
      parity(
        'function fn() {} fn.cache = {}; fn.cache.a = 1; return [fn.cache.a, Object.keys(fn)];'
      )
    ).toEqual([1, ['cache']]);
  });

  it('visits the added property in for...in', () => {
    expect(
      parity(
        'function fn() {} fn.a = 1; var keys = []; for (var k in fn) { keys.push(k); } return keys;'
      )
    ).toEqual(['a']);
  });
});

describe('assign:built-in function', () => {
  it('takes properties on a built-in method', () => {
    expect(parity('var p = [].push; p.cache = 1; return [p.cache, [].push.cache];')).toEqual([
      1, 1
    ]);
  });

  it('takes properties on a global function and a namespace', () => {
    expect(
      parity('parseInt.cache = 1; Math.answer = 42; return [parseInt.cache, Math.answer];')
    ).toEqual([1, 42]);
  });
});
