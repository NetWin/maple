import { describe, expect, it } from 'vitest';
import { bothThrow, parity } from '../parity.ts';

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
    expect(bothThrow('var o = {}; return o.missing();')).toBe('TypeError');
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
  it('are the ones the language gives them', () => {
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
