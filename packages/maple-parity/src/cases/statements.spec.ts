import { describe, expect, it } from 'vitest';
import { bothThrow, parity } from '../parity.ts';

describe('syntax:VariableDeclaration', () => {
  it('hoists a var as undefined', () => {
    expect(
      parity('var before = typeof hoisted; var hoisted = 1; return [before, hoisted];')
    ).toStrictEqual(['undefined', 1]);
  });

  it('scopes a var in a block to the function', () => {
    expect(parity('if (true) { var inner = 2; } return inner;')).toBe(2);
  });

  it('declares several names at once', () => {
    expect(parity('var a = 1, b = a + 1, c; return [a, b, c];')).toStrictEqual([1, 2, undefined]);
  });

  it('keeps a value when a var is declared again', () => {
    expect(parity('var a = 1; var a; return a;')).toBe(1);
  });
});

describe('syntax:EmptyStatement', () => {
  it('ignores empty statements', () => {
    expect(parity(';;; var a = 1;; return a;')).toBe(1);
  });

  it('allows an empty loop body', () => {
    expect(parity('for (var i = 0; i < 3; i++); return i;')).toBe(3);
  });
});

describe('syntax:BlockStatement', () => {
  it('runs nested blocks', () => {
    expect(parity('var a = 0; { a += 1; { a += 2; } } return a;')).toBe(3);
  });
});

describe('syntax:ExpressionStatement', () => {
  it('evaluates an expression for its effect', () => {
    expect(parity('var a = []; a.push(1); a.length = 3; return a.length;')).toBe(3);
  });
});

describe('syntax:ReturnStatement', () => {
  it('returns the value of its expression', () => {
    expect(parity('return 6 * 7;')).toBe(42);
  });

  it('returns undefined without an expression', () => {
    expect(parity('function f() { return; } return f();')).toBe(undefined);
  });

  it('stops the function', () => {
    expect(parity('function f() { return 1; return 2; } return f();')).toBe(1);
  });

  it('reads globals from data', () => {
    expect(parity('return limit * factor;', { 'limit': 6, 'factor': 7 })).toBe(42);
  });

  it('reads nested data', () => {
    expect(
      parity('return order.items[1].price + order.items.length;', {
        'order': { 'items': [{ 'price': 1 }, { 'price': 2.5 }] }
      })
    ).toBe(4.5);
  });

  it('returns nothing when the script has no return', () => {
    expect(parity('var a = 1;')).toBe(undefined);
  });
});

describe('syntax:IfStatement', () => {
  it('runs the consequent without braces', () => {
    expect(parity('var a = 1; if (a > 0) a = 2; return a;')).toBe(2);
  });

  it('skips the consequent when false', () => {
    expect(parity('var a = 1; if (a < 0) { a = 2; } return a;')).toBe(1);
  });

  it('chains else if', () => {
    expect(
      parity(
        'function grade(n) { if (n > 90) { return "A"; } else if (n > 70) { return "B"; } else { return "C"; } } return [grade(95), grade(80), grade(10)];'
      )
    ).toStrictEqual(['A', 'B', 'C']);
  });

  it('tests truthiness', () => {
    expect(
      parity(
        'var out = []; var values = [0, 1, "", "a", null, {}, []]; for (var i = 0; i < values.length; i++) { if (values[i]) { out.push(i); } } return out;'
      )
    ).toStrictEqual([1, 3, 5, 6]);
  });
});

describe('syntax:ConditionalExpression', () => {
  it('picks a branch', () => {
    expect(
      parity('var n = 5; return [n > 3 ? "big" : "small", n < 3 ? "big" : "small"];')
    ).toStrictEqual(['big', 'small']);
  });

  it('nests', () => {
    expect(
      parity(
        'function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; } return [sign(4), sign(-4), sign(0)];'
      )
    ).toStrictEqual([1, -1, 0]);
  });

  it('only evaluates the chosen branch', () => {
    expect(parity('var hits = 0; var r = true ? 1 : hits++; return [r, hits];')).toStrictEqual([
      1, 0
    ]);
  });
});

describe('syntax:WhileStatement', () => {
  it('loops while the test holds', () => {
    expect(parity('var i = 0, sum = 0; while (i < 5) { sum += i; i++; } return sum;')).toBe(10);
  });

  it('does not run when the test fails at once', () => {
    expect(parity('var runs = 0; while (false) { runs++; } return runs;')).toBe(0);
  });
});

describe('syntax:DoWhileStatement', () => {
  it('runs at least once', () => {
    expect(parity('var runs = 0; do { runs++; } while (false); return runs;')).toBe(1);
  });

  it('loops while the test holds', () => {
    expect(parity('var i = 0; do { i += 2; } while (i < 7); return i;')).toBe(8);
  });
});

describe('syntax:ForStatement', () => {
  it('runs with all three clauses', () => {
    expect(
      parity('var out = []; for (var i = 0; i < 3; i++) { out.push(i); } return out;')
    ).toStrictEqual([0, 1, 2]);
  });

  it('runs with empty clauses', () => {
    expect(parity('var i = 0; for (;;) { if (++i > 4) break; } return i;')).toBe(5);
  });

  it('keeps its var after the loop', () => {
    expect(parity('for (var i = 0; i < 3; i++) {} return i;')).toBe(3);
  });

  it('updates several variables with a comma', () => {
    expect(
      parity(
        'var out = []; for (var i = 0, j = 10; i < 3; i++, j--) { out.push(i + j); } return out;'
      )
    ).toStrictEqual([10, 10, 10]);
  });
});

describe('syntax:ForInStatement', () => {
  it('visits the keys of an object', () => {
    expect(
      parity(
        'var o = { a: 1, b: 2, c: 3 }; var keys = []; for (var k in o) { keys.push(k + o[k]); } return keys;'
      )
    ).toStrictEqual(['a1', 'b2', 'c3']);
  });

  it('visits array indices as strings', () => {
    expect(
      parity('var keys = []; for (var k in ["x", "y"]) { keys.push(typeof k + k); } return keys;')
    ).toStrictEqual(['string0', 'string1']);
  });

  it('assigns to an existing variable', () => {
    expect(parity('var k, last; for (k in { a: 1, b: 2 }) { last = k; } return last;')).toBe('b');
  });

  it('runs no iterations over null and undefined', () => {
    expect(
      parity('var n = 0; for (var k in null) { n++; } for (var j in undefined) { n++; } return n;')
    ).toBe(0);
  });

  it('visits the keys of data', () => {
    expect(
      parity('var sum = 0; for (var k in prices) { sum += prices[k]; } return sum;', {
        'prices': { 'a': 2, 'b': 3 }
      })
    ).toBe(5);
  });

  it('assigns to a member', () => {
    expect(
      parity(
        'var o = {}; var seen = []; for (o.key in { a: 1, b: 2 }) { seen.push(o.key); } return seen;'
      )
    ).toStrictEqual(['a', 'b']);
  });
});

describe('syntax:BreakStatement', () => {
  it('leaves a loop', () => {
    expect(parity('var i; for (i = 0; i < 10; i++) { if (i === 3) { break; } } return i;')).toBe(3);
  });

  it('leaves only the inner loop', () => {
    expect(
      parity(
        'var n = 0; for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) { if (j === 1) break; n++; } } return n;'
      )
    ).toBe(3);
  });

  it('leaves a while loop', () => {
    expect(parity('var i = 0; while (true) { if (i++ === 4) { break; } } return i;')).toBe(5);
  });
});

describe('syntax:ContinueStatement', () => {
  it('skips an iteration of a for loop', () => {
    expect(
      parity(
        'var out = []; for (var i = 0; i < 5; i++) { if (i % 2) { continue; } out.push(i); } return out;'
      )
    ).toStrictEqual([0, 2, 4]);
  });

  it('skips an iteration of a while loop', () => {
    expect(
      parity('var i = 0, n = 0; while (i < 5) { i++; if (i === 2) continue; n += i; } return n;')
    ).toBe(13);
  });

  it('checks the condition of a do while loop', () => {
    expect(
      parity(
        'var i = 0, n = 0; do { i++; if (i < 3) continue; n++; } while (i < 5); return [i, n];'
      )
    ).toStrictEqual([5, 3]);
  });

  it('skips a key of a for in loop', () => {
    expect(
      parity(
        'var out = []; for (var k in { a: 1, b: 2, c: 3 }) { if (k === "b") continue; out.push(k); } return out;'
      )
    ).toStrictEqual(['a', 'c']);
  });
});

describe('syntax:LabeledStatement', () => {
  it('labels a block that break leaves', () => {
    expect(
      parity(
        'var steps = []; block: { steps.push(1); if (true) { break block; } steps.push(2); } steps.push(3); return steps;'
      )
    ).toStrictEqual([1, 3]);
  });

  it('puts several labels on one loop', () => {
    expect(
      parity('var i = 0; a: b: for (;;) { i++; if (i < 3) continue b; break a; } return i;')
    ).toBe(3);
  });

  it('leaves an unlabelled break to the inner loop', () => {
    expect(
      parity(
        'var n = 0; outer: for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) { if (j === 1) break; n++; } } return n;'
      )
    ).toBe(3);
  });

  it('reuses a label in sibling statements', () => {
    expect(
      parity(
        'var n = 0; a: for (var i = 0; i < 2; i++) { n++; break a; } a: for (var j = 0; j < 2; j++) { n++; break a; } return n;'
      )
    ).toBe(2);
  });
});

describe('syntax:BreakStatement:label', () => {
  it('leaves an outer for loop', () => {
    expect(
      parity(
        'var found = null; outer: for (var i = 0; i < 5; i++) { for (var j = 0; j < 5; j++) { if (i * j === 6) { found = [i, j]; break outer; } } } return found;'
      )
    ).toStrictEqual([2, 3]);
  });

  it('leaves a do while loop from an inner loop', () => {
    expect(
      parity(
        'var i = 0; again: do { i++; while (true) { if (i > 2) break again; break; } } while (true); return i;'
      )
    ).toBe(3);
  });

  it('leaves a loop from inside a switch', () => {
    expect(
      parity(
        'var i = 0; loop: for (;;) { switch (i) { case 3: break loop; default: i++; } } return i;'
      )
    ).toBe(3);
  });

  it('runs finally on the way out', () => {
    expect(
      parity(
        'var log = []; outer: for (var i = 0; i < 3; i++) { try { if (i === 1) break outer; log.push("t" + i); } finally { log.push("f" + i); } } return log;'
      )
    ).toStrictEqual(['t0', 'f0', 'f1']);
  });

  it('leaves nested blocks', () => {
    expect(
      parity(
        'var log = []; outer: { inner: { log.push(1); break outer; } log.push(2); } return log;'
      )
    ).toStrictEqual([1]);
  });
});

describe('syntax:ContinueStatement:label', () => {
  it('continues an outer for loop', () => {
    expect(
      parity(
        'var out = []; rows: for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) { if (j > i) { continue rows; } out.push("" + i + j); } } return out;'
      )
    ).toStrictEqual(['00', '10', '11', '20', '21', '22']);
  });

  it('continues an outer while loop', () => {
    expect(
      parity(
        'var i = 0, n = 0; loop: while (i < 4) { i++; var j = 0; while (j < 4) { j++; if (j === 2) continue loop; n++; } } return [i, n];'
      )
    ).toStrictEqual([4, 4]);
  });

  it('continues an outer for in loop', () => {
    expect(
      parity(
        'var out = []; keys: for (var k in { a: 1, b: 2 }) { for (var i = 0; i < 2; i++) { if (i) continue keys; out.push(k + i); } } return out;'
      )
    ).toStrictEqual(['a0', 'b0']);
  });

  it('continues an outer do while loop', () => {
    expect(
      parity(
        'var i = 0, n = 0; outer: do { i++; for (var j = 0; j < 3; j++) { if (j === 1) continue outer; n++; } } while (i < 3); return [i, n];'
      )
    ).toStrictEqual([3, 3]);
  });

  it('continues its own loop', () => {
    expect(
      parity(
        'var n = 0; self: for (var i = 0; i < 4; i++) { if (i % 2) continue self; n++; } return n;'
      )
    ).toBe(2);
  });
});

describe('syntax:SwitchStatement', () => {
  it('picks the matching case', () => {
    expect(
      parity(
        'function name(n) { switch (n) { case 1: return "one"; case 2: return "two"; default: return "many"; } } return [name(1), name(2), name(9)];'
      )
    ).toStrictEqual(['one', 'two', 'many']);
  });

  it('falls through until break', () => {
    expect(
      parity(
        'var out = []; switch (2) { case 1: out.push(1); case 2: out.push(2); case 3: out.push(3); break; case 4: out.push(4); } return out;'
      )
    ).toStrictEqual([2, 3]);
  });

  it('compares strictly', () => {
    expect(
      parity('switch ("1") { case 1: return "number"; case "1": return "string"; } return "none";')
    ).toBe('string');
  });

  it('does nothing without a match or default', () => {
    expect(parity('var hit = false; switch (5) { case 1: hit = true; } return hit;')).toBe(false);
  });

  it('evaluates case expressions', () => {
    expect(parity('var x = 4; switch (x) { case 2 + 2: return "four"; } return "other";')).toBe(
      'four'
    );
  });
});

describe('syntax:SwitchCase:default', () => {
  it('runs when nothing matches', () => {
    expect(parity('switch (9) { case 1: return "one"; default: return "default"; }')).toBe(
      'default'
    );
  });

  it('falls through from the middle', () => {
    expect(
      parity(
        'var out = []; switch (9) { case 1: out.push(1); default: out.push("d"); case 2: out.push(2); } return out;'
      )
    ).toStrictEqual(['d', 2]);
  });

  it('is skipped when a later case matches', () => {
    expect(
      parity(
        'var out = []; switch (2) { default: out.push("d"); case 2: out.push(2); } return out;'
      )
    ).toStrictEqual([2]);
  });
});

describe('syntax:ThrowStatement', () => {
  it('throws a string', () => {
    expect(parity('try { throw "plain"; } catch (e) { return [typeof e, e]; }')).toStrictEqual([
      'string',
      'plain'
    ]);
  });

  it('throws a number and an object', () => {
    expect(
      parity(
        'var out = []; try { throw 42; } catch (e) { out.push(e); } try { throw { code: 7 }; } catch (e) { out.push(e.code); } return out;'
      )
    ).toStrictEqual([42, 7]);
  });

  it('fails the run when nothing catches it', () => {
    expect(bothThrow('throw new TypeError("not caught");')).toBe('TypeError');
  });

  it('fails the run with a thrown string', () => {
    expect(bothThrow('throw "plain";')).toBe('Error');
  });
});

describe('syntax:TryStatement', () => {
  it('catches an error', () => {
    expect(parity('try { throw new Error("boom"); } catch (e) { return e.message; }')).toBe('boom');
  });

  it('rethrows from catch', () => {
    expect(
      parity(
        'try { try { throw new Error("inner"); } catch (e) { throw new Error(e.message + " again"); } } catch (e) { return e.message; }'
      )
    ).toBe('inner again');
  });

  it('catches a runtime error', () => {
    expect(parity('try { null.x; } catch (e) { return e instanceof TypeError; }')).toBe(true);
  });

  it('catches an error from a called function', () => {
    expect(
      parity(
        'function fail() { throw new RangeError("deep"); } try { fail(); } catch (e) { return [e.name, e.message]; }'
      )
    ).toStrictEqual(['RangeError', 'deep']);
  });
});

describe('syntax:CatchClause', () => {
  it('scopes its parameter to the block', () => {
    expect(
      parity('var e = "outer"; try { throw "inner"; } catch (e) { e = "changed"; } return e;')
    ).toBe('outer');
  });

  it('is skipped when nothing throws', () => {
    expect(
      parity('var caught = false; try { var a = 1; } catch (e) { caught = true; } return caught;')
    ).toBe(false);
  });
});

describe('syntax:TryStatement:finalizer', () => {
  it('runs after try', () => {
    expect(
      parity('var log = []; try { log.push("try"); } finally { log.push("finally"); } return log;')
    ).toStrictEqual(['try', 'finally']);
  });

  it('runs after catch', () => {
    expect(
      parity(
        'var log = []; try { throw 1; } catch (e) { log.push("catch"); } finally { log.push("finally"); } return log;'
      )
    ).toStrictEqual(['catch', 'finally']);
  });

  it('overrides a return in try', () => {
    expect(
      parity('function f() { try { return "try"; } finally { return "finally"; } } return f();')
    ).toBe('finally');
  });

  it('swallows a throw by returning', () => {
    expect(
      parity(
        'function f() { try { throw new Error("lost"); } finally { return "kept"; } } return f();'
      )
    ).toBe('kept');
  });

  it('runs when try returns', () => {
    expect(
      parity(
        'var log = []; function f() { try { return 1; } finally { log.push("cleanup"); } } return [f(), log];'
      )
    ).toStrictEqual([1, ['cleanup']]);
  });

  it('breaks out of a loop', () => {
    expect(
      parity(
        'var n = 0; for (var i = 0; i < 5; i++) { try { n++; } finally { if (i === 2) break; } } return n;'
      )
    ).toBe(3);
  });

  it('lets an uncaught throw pass after running', () => {
    expect(
      parity(
        'var log = []; try { try { throw new Error("x"); } finally { log.push("f"); } } catch (e) { log.push(e.message); } return log;'
      )
    ).toStrictEqual(['f', 'x']);
  });
});

describe('syntax:FunctionDeclaration', () => {
  it('declares a callable function', () => {
    expect(parity('function add(a, b) { return a + b; } return add(2, 3);')).toBe(5);
  });
});

describe('syntax:FunctionExpression', () => {
  it('creates a function value', () => {
    expect(parity('var square = function (n) { return n * n; }; return square(7);')).toBe(49);
  });
});

describe('syntax:FunctionExpression:named', () => {
  it('refers to itself by name', () => {
    expect(
      parity('var fact = function f(n) { return n <= 1 ? 1 : n * f(n - 1); }; return fact(5);')
    ).toBe(120);
  });
});

describe('syntax:CallExpression', () => {
  it('calls with arguments', () => {
    expect(
      parity('function f(a, b, c) { return [a, b, c]; } return f(1, "2", [3]);')
    ).toStrictEqual([1, '2', [3]]);
  });

  it('evaluates the arguments in order', () => {
    expect(
      parity(
        'var log = []; function note(v) { log.push(v); return v; } function f() {} f(note(1), note(2), note(3)); return log;'
      )
    ).toStrictEqual([1, 2, 3]);
  });

  it('calls a member', () => {
    expect(parity('var o = { f: function (x) { return x * 2; } }; return o.f(4);')).toBe(8);
  });

  it('throws when calling a non-function', () => {
    expect(bothThrow('var notFn = 1; return notFn();')).toBe('TypeError');
  });
});

describe('syntax:Literal:string', () => {
  it('reads escapes', () => {
    expect(
      parity(
        'return ["a\\tb", "line\\nbreak", "q\\"uote", \'s\\\'ingle\', "\\u0041\\x42", "back\\\\slash"];'
      )
    ).toStrictEqual(['a\tb', 'line\nbreak', 'q"uote', "s'ingle", 'AB', 'back\\slash']);
  });

  it('reads single and double quotes alike', () => {
    expect(parity('return "abc" === \'abc\';')).toBe(true);
  });
});

describe('syntax:Literal:number', () => {
  it('reads hex, exponents and fractions', () => {
    expect(parity('return [0x1F, 0xff, 1e3, 1.5e-2, .5, 5., 0];')).toStrictEqual([
      31, 255, 1000, 0.015, 0.5, 5, 0
    ]);
  });
});

describe('syntax:Literal:boolean', () => {
  it('reads true and false', () => {
    expect(parity('return [true, false, typeof true];')).toStrictEqual([true, false, 'boolean']);
  });
});

describe('syntax:Literal:null', () => {
  it('reads null', () => {
    expect(parity('return [null, typeof null, null === null];')).toStrictEqual([
      null,
      'object',
      true
    ]);
  });
});

describe('syntax:Literal:regex', () => {
  it('creates a regexp', () => {
    expect(
      parity('var r = /ab+c/i; return [r.test("xABBC"), r.source, r.ignoreCase];')
    ).toStrictEqual([true, 'ab+c', true]);
  });

  it('creates a new regexp on every evaluation', () => {
    expect(
      parity(
        'function make() { return /a/g; } var a = make(); a.lastIndex = 2; return [make().lastIndex, a.lastIndex];'
      )
    ).toStrictEqual([0, 2]);
  });
});

describe('syntax:ArrayExpression', () => {
  it('creates an array', () => {
    expect(parity('return [1, "two", [3], { four: 4 }];')).toStrictEqual([
      1,
      'two',
      [3],
      { four: 4 }
    ]);
  });

  it('ignores a trailing comma', () => {
    expect(parity('return [1, 2, ].length;')).toBe(2);
  });
});

describe('syntax:ArrayExpression:hole', () => {
  it('leaves a hole in a sparse array', () => {
    expect(
      parity('var a = [1, , 3]; return [a.length, 0 in a, 1 in a, a[1] === undefined];')
    ).toStrictEqual([3, true, false, true]);
  });

  it('counts leading holes in the length', () => {
    expect(parity('var a = [, , 1]; return [a.length, a[2]];')).toStrictEqual([3, 1]);
  });
});

describe('syntax:ObjectExpression', () => {
  it('creates an object with string and number keys', () => {
    expect(
      parity(
        'var o = { "a b": 1, 2: "two", plain: true }; return [o["a b"], o[2], o["2"], o.plain];'
      )
    ).toStrictEqual([1, 'two', 'two', true]);
  });

  it('nests objects and arrays', () => {
    expect(parity('return { list: [1, { deep: [2, 3] }], empty: {}, none: [] };')).toStrictEqual({
      list: [1, { deep: [2, 3] }],
      empty: {},
      none: []
    });
  });

  it('lets a later key win', () => {
    expect(parity('var o = { a: 1, b: 2 }; return { a: 1, a2: o.a, b: o.b };')).toStrictEqual({
      a: 1,
      a2: 1,
      b: 2
    });
  });
});

describe('syntax:MemberExpression', () => {
  it('reads a missing property as undefined', () => {
    expect(parity('var o = {}; return [o.missing, typeof o.missing];')).toStrictEqual([
      undefined,
      'undefined'
    ]);
  });

  it('throws reading a property of undefined', () => {
    expect(bothThrow('var o; return o.x;')).toBe('TypeError');
  });

  it('throws reading a property of null', () => {
    expect(bothThrow('var o = null; return o.x;')).toBe('TypeError');
  });

  it('creates properties by assignment', () => {
    expect(parity('var o = {}; o.a = 1; o.a += 5; return o;')).toStrictEqual({ a: 6 });
  });

  it('reads the length of a string', () => {
    expect(parity('var s = "hey"; return s.length;')).toBe(3);
  });

  it('shortens an array through its length', () => {
    expect(parity('var a = [1, 2, 3, 4]; a.length = 2; return a;')).toStrictEqual([1, 2]);
  });
});

describe('syntax:MemberExpression:computed', () => {
  it('reads computed keys', () => {
    expect(
      parity('var o = { ab: 1 }; var k = "a"; return [o[k + "b"], o["ab"], [10, 20][1]];')
    ).toStrictEqual([1, 1, 20]);
  });

  it('grows an array by index', () => {
    expect(parity('var a = []; a[2] = "x"; return [a.length, a[2], a[0]];')).toStrictEqual([
      3,
      'x',
      undefined
    ]);
  });

  it('indexes a string', () => {
    expect(parity('var s = "hey"; return [s[0], s[2], s[5]];')).toStrictEqual([
      'h',
      'y',
      undefined
    ]);
  });

  it('converts a number key to a string', () => {
    expect(
      parity('var o = {}; o[1] = "a"; o[1.5] = "b"; return [o["1"], o["1.5"]];')
    ).toStrictEqual(['a', 'b']);
  });
});

describe('syntax:SequenceExpression', () => {
  it('yields the last value', () => {
    expect(parity('var a = 0; var b = (a++, a++, a * 10); return [a, b];')).toStrictEqual([2, 20]);
  });
});

describe('syntax:NewExpression', () => {
  it('constructs an error', () => {
    expect(
      parity('var e = new RangeError("r"); return [e.name, e.message, e instanceof RangeError];')
    ).toStrictEqual(['RangeError', 'r', true]);
  });

  it('constructs a date and a regexp', () => {
    expect(
      parity(
        'var d = new Date(0); var r = new RegExp("a+", "g"); return [d.getTime(), r.global, r.source];'
      )
    ).toStrictEqual([0, true, 'a+']);
  });

  it('constructs without parentheses', () => {
    expect(parity('var d = new Date; return typeof d.getTime();')).toBe('number');
  });

  it('constructs an array with a length', () => {
    expect(parity('var a = new Array(3); return [a.length, 0 in a];')).toStrictEqual([3, false]);
  });

  it('constructs an array with elements', () => {
    expect(parity('return new Array(1, 2, 3);')).toStrictEqual([1, 2, 3]);
  });

  it('constructs an object', () => {
    expect(parity('var o = new Object(); o.a = 1; return o;')).toStrictEqual({ a: 1 });
  });

  it('calls Array without new', () => {
    expect(parity('return [Array(2).length, Array("a", "b")];')).toStrictEqual([2, ['a', 'b']]);
  });

  it('calls Object without new', () => {
    expect(parity('var o = Object(); o.k = 1; return o;')).toStrictEqual({ k: 1 });
  });
});

describe('unary:-', () => {
  it('negates and coerces', () => {
    expect(parity('return [-"3", -true, -null, -"", -[2]];')).toStrictEqual([-3, -1, -0, -0, -2]);
  });

  it('negates zero to negative zero', () => {
    expect(parity('return 1 / -0 === -Infinity;')).toBe(true);
  });
});

describe('unary:+', () => {
  it('converts to a number', () => {
    expect(
      parity('return [+"4", +"", +"x" !== +"x", +null, +[], +[5], +" 12 ", +"0x10", +true];')
    ).toStrictEqual([4, 0, true, 0, 0, 5, 12, 16, 1]);
  });
});

describe('unary:!', () => {
  it('negates truthiness', () => {
    expect(parity('return [!0, !1, !"", !"a", !null, !undefined, !{}, ![], !NaN];')).toStrictEqual([
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true
    ]);
  });
});

describe('unary:~', () => {
  it('inverts the bits', () => {
    expect(parity('return [~0, ~-1, ~5, ~"7", ~1.9];')).toStrictEqual([-1, 0, -6, -8, -2]);
  });
});

describe('unary:typeof', () => {
  it('names every kind of value', () => {
    expect(
      parity(
        'return [typeof 1, typeof "s", typeof true, typeof undefined, typeof null, typeof {}, typeof [], typeof function () {}, typeof /x/, typeof new Date(0), typeof Math];'
      )
    ).toStrictEqual([
      'number',
      'string',
      'boolean',
      'undefined',
      'object',
      'object',
      'object',
      'function',
      'object',
      'object',
      'object'
    ]);
  });

  it('answers undefined for an undeclared name', () => {
    expect(parity('return typeof undeclaredName;')).toBe('undefined');
  });

  it('names built-in functions', () => {
    expect(parity('return [typeof parseInt, typeof Math.max, typeof "".charAt];')).toStrictEqual([
      'function',
      'function',
      'function'
    ]);
  });

  it('names constructors as functions', () => {
    expect(
      parity('return [typeof Array, typeof Object, typeof String, typeof Date, typeof Error];')
    ).toStrictEqual(['function', 'function', 'function', 'function', 'function']);
  });
});

describe('unary:void', () => {
  it('returns undefined after evaluating', () => {
    expect(
      parity('var n = 0; var r = void n++; return [r === undefined, n, void 0 === undefined];')
    ).toStrictEqual([true, 1, true]);
  });
});

describe('unary:delete', () => {
  it('removes an object property', () => {
    expect(
      parity('var o = { a: 1, b: 2 }; var deleted = delete o.a; return [deleted, o, "a" in o];')
    ).toStrictEqual([true, { b: 2 }, false]);
  });

  it('leaves a hole in an array', () => {
    expect(
      parity('var a = [1, 2, 3]; delete a[1]; return [a.length, 1 in a, a[1] === undefined];')
    ).toStrictEqual([3, false, true]);
  });

  it('removes a computed member and ignores a missing one', () => {
    expect(
      parity(
        'var o = { key: 1 }; var k = "key"; return [delete o[k], delete o.nothing, o.key === undefined];'
      )
    ).toStrictEqual([true, true, true]);
  });
});

describe('update:++', () => {
  it('increments before and after reading', () => {
    expect(parity('var a = 1; var b = a++; var c = ++a; return [a, b, c];')).toStrictEqual([
      3, 1, 3
    ]);
  });

  it('coerces to a number', () => {
    expect(
      parity('var s = "5"; s++; var n = null; n++; var u; u++; return [s, n, u !== u];')
    ).toStrictEqual([6, 1, true]);
  });

  it('increments members', () => {
    expect(
      parity('var o = { n: 1 }; var a = [0]; o.n++; ++a[0]; a[0]++; return [o.n, a[0]];')
    ).toStrictEqual([2, 2]);
  });
});

describe('update:--', () => {
  it('decrements before and after reading', () => {
    expect(parity('var a = 5; var b = a--; var c = --a; return [a, b, c];')).toStrictEqual([
      3, 5, 3
    ]);
  });

  it('decrements a member', () => {
    expect(parity('var o = { n: "3" }; o.n--; return o.n;')).toBe(2);
  });
});

describe('binary:+', () => {
  it('adds numbers and concatenates strings', () => {
    expect(
      parity('return [1 + 2, "1" + 2, 1 + "2", 1 + 2 + "3", "1" + 2 + 3, true + 1, null + 1];')
    ).toStrictEqual([3, '12', '12', '33', '123', 2, 1]);
  });

  it('converts objects to strings', () => {
    expect(parity('return [[] + [], [1, 2] + "", {} + "x", [1, [2, 3]] + ""];')).toStrictEqual([
      '',
      '1,2',
      '[object Object]x',
      '1,2,3'
    ]);
  });

  it('gives NaN for undefined', () => {
    expect(parity('var u; return isNaN(u + 1);')).toBe(true);
  });

  it('adds floating point numbers', () => {
    expect(parity('return 0.1 + 0.2;')).toBe(0.30000000000000004);
  });
});

describe('binary:-', () => {
  it('subtracts and coerces', () => {
    expect(parity('return ["10" - 3, 5 - true, "a" - 1 !== "a" - 1, null - 1];')).toStrictEqual([
      7,
      4,
      true,
      -1
    ]);
  });
});

describe('binary:*', () => {
  it('multiplies and coerces', () => {
    expect(parity('return ["4" * "5", 0.1 * 3, -2 * 0];')).toStrictEqual([
      20, 0.30000000000000004, -0
    ]);
  });
});

describe('binary:/', () => {
  it('divides, including by zero', () => {
    expect(parity('return ["9" / 3, 1 / 0, -1 / 0, 0 / 0 !== 0 / 0, 1 / 3];')).toStrictEqual([
      3,
      Infinity,
      -Infinity,
      true,
      0.3333333333333333
    ]);
  });
});

describe('binary:%', () => {
  it('takes the sign of the dividend', () => {
    expect(
      parity('return [7 % 3, -7 % 3, 7 % -3, -7 % -3, 5.5 % 2, 5 % 0 !== 5 % 0];')
    ).toStrictEqual([1, -1, 1, -1, 1.5, true]);
  });
});

describe('binary:&', () => {
  it('ands the bits', () => {
    expect(parity('return [5 & 3, -1 & 255, "6" & "3", 1.9 & 1];')).toStrictEqual([1, 255, 2, 1]);
  });
});

describe('binary:|', () => {
  it('ors the bits', () => {
    expect(parity('return [5 | 3, 1.9 | 0, -1.9 | 0, 4294967297 | 0];')).toStrictEqual([
      7, 1, -1, 1
    ]);
  });
});

describe('binary:^', () => {
  it('xors the bits', () => {
    expect(parity('return [5 ^ 3, -1 ^ 0, "12" ^ 5];')).toStrictEqual([6, -1, 9]);
  });
});

describe('binary:<<', () => {
  it('shifts left', () => {
    expect(parity('return [1 << 4, 1 << 31, 1 << 33, -1 << 1];')).toStrictEqual([
      16, -2147483648, 2, -2
    ]);
  });
});

describe('binary:>>', () => {
  it('shifts right with the sign', () => {
    expect(parity('return [-16 >> 2, 16 >> 2, -1 >> 31, 5 >> 33];')).toStrictEqual([-4, 4, -1, 2]);
  });
});

describe('binary:>>>', () => {
  it('shifts right without the sign', () => {
    expect(parity('return [-1 >>> 0, -16 >>> 2, 16 >>> 2, -1 >>> 28];')).toStrictEqual([
      4294967295, 1073741820, 4, 15
    ]);
  });
});

describe('binary:===', () => {
  it('compares strictly', () => {
    expect(
      parity('return [1 === 1, 1 === "1", null === undefined, NaN === NaN, "a" === "a", 0 === -0];')
    ).toStrictEqual([true, false, false, false, true, true]);
  });

  it('compares objects by identity', () => {
    expect(parity('var a = {}; var b = a; return [a === b, a === {}, [] === []];')).toStrictEqual([
      true,
      false,
      false
    ]);
  });
});

describe('binary:!==', () => {
  it('is the opposite of strict equality', () => {
    expect(parity('return [1 !== "1", 2 !== 2, NaN !== NaN];')).toStrictEqual([true, false, true]);
  });
});

describe('binary:==', () => {
  it('converts across types', () => {
    expect(
      parity(
        'return [1 == "1", 0 == "", 0 == "0", "" == "0", null == undefined, null == 0, undefined == 0, true == 1, false == "0", "1" == true, NaN == NaN];'
      )
    ).toStrictEqual([true, true, true, false, true, false, false, true, true, true, false]);
  });

  it('converts objects to primitives', () => {
    expect(parity('return [[1] == 1, [1, 2] == "1,2", [] == "", [] == 0];')).toStrictEqual([
      true,
      true,
      true,
      true
    ]);
  });
});

describe('binary:!=', () => {
  it('is the opposite of loose equality', () => {
    expect(parity('return [1 != "1", null != undefined, 2 != 3, "a" != "b"];')).toStrictEqual([
      false,
      false,
      true,
      true
    ]);
  });
});

describe('binary:<', () => {
  it('compares numbers and strings', () => {
    expect(
      parity('return [1 < 2, "a" < "b", "B" < "a", "10" < "9", "10" < 9, null < 1];')
    ).toStrictEqual([true, true, true, true, false, true]);
  });

  it('is false with NaN', () => {
    expect(parity('return [NaN < 1, 1 < NaN, undefined < 1, "x" < 1];')).toStrictEqual([
      false,
      false,
      false,
      false
    ]);
  });
});

describe('binary:<=', () => {
  it('compares numbers and strings', () => {
    expect(parity('return [2 <= 2, 3 <= 2, "a" <= "a", null <= 0, NaN <= NaN];')).toStrictEqual([
      true,
      false,
      true,
      true,
      false
    ]);
  });
});

describe('binary:>', () => {
  it('compares numbers and strings', () => {
    expect(parity('return [3 > 4, 10 > "9", "b" > "a", null > -1, NaN > 1];')).toStrictEqual([
      false,
      true,
      true,
      true,
      false
    ]);
  });
});

describe('binary:>=', () => {
  it('compares numbers and strings', () => {
    expect(parity('return [4 >= 4, "a" >= "b", null >= 0, NaN >= NaN];')).toStrictEqual([
      true,
      false,
      true,
      false
    ]);
  });
});

describe('binary:in', () => {
  it('looks for keys of objects and arrays', () => {
    expect(
      parity(
        'var o = { a: undefined }; return ["a" in o, "b" in o, 0 in [1], 1 in [1], "length" in []];'
      )
    ).toStrictEqual([true, false, true, false, true]);
  });

  it('converts the key to a string', () => {
    expect(parity('var o = { 1: "x" }; return [1 in o, "1" in o];')).toStrictEqual([true, true]);
  });

  it('throws on a primitive', () => {
    expect(bothThrow('return "a" in "abc";')).toBe('TypeError');
  });
});

describe('binary:instanceof', () => {
  it('tests built-in constructors', () => {
    expect(
      parity(
        'return [new Error("x") instanceof Error, new TypeError("x") instanceof Error, [] instanceof Array, new Date(0) instanceof Date, /x/ instanceof RegExp, {} instanceof Array];'
      )
    ).toStrictEqual([true, true, true, true, true, false]);
  });

  it('tests Object', () => {
    expect(
      parity('return [{} instanceof Object, [] instanceof Object, 1 instanceof Object];')
    ).toStrictEqual([true, true, false]);
  });

  it('throws for a right side that is no function', () => {
    expect(bothThrow('return {} instanceof 1;')).toBe('TypeError');
  });
});

describe('logical:&&', () => {
  it('returns an operand', () => {
    expect(parity('return [1 && 2, 0 && 2, "" && "x", null && 1, "a" && "b"];')).toStrictEqual([
      2,
      0,
      '',
      null,
      'b'
    ]);
  });

  it('short circuits', () => {
    expect(
      parity(
        'var calls = 0; function hit() { calls++; return true; } false && hit(); true && hit(); return calls;'
      )
    ).toBe(1);
  });
});

describe('logical:||', () => {
  it('returns an operand', () => {
    expect(
      parity('return [0 || 2, 1 || 2, "" || "fallback", null || undefined || "last"];')
    ).toStrictEqual([2, 1, 'fallback', 'last']);
  });

  it('short circuits', () => {
    expect(
      parity(
        'var calls = 0; function hit() { calls++; return true; } true || hit(); false || hit(); return calls;'
      )
    ).toBe(1);
  });
});

describe('assign:=', () => {
  it('returns the assigned value', () => {
    expect(parity('var a, b; a = b = 3; var c = (a = 5); return [a, b, c];')).toStrictEqual([
      5, 3, 5
    ]);
  });

  it('throws for an undeclared name in strict mode', () => {
    expect(bothThrow('notDeclared = 1; return notDeclared;')).toBe('ReferenceError');
  });

  it('assigns to members', () => {
    expect(parity('var o = {}; var a = []; o["k"] = 1; a[0] = o; return a;')).toStrictEqual([
      { k: 1 }
    ]);
  });
});

describe('assign:+=', () => {
  it('adds and concatenates', () => {
    expect(
      parity('var a = 10; a += 5; var s = "a"; s += "b"; s += 1; return [a, s];')
    ).toStrictEqual([15, 'ab1']);
  });

  it('adds to a member', () => {
    expect(
      parity('var o = { n: 2 }; var a = [1]; o.n += 3; a[0] += 1; return [o.n, a[0]];')
    ).toStrictEqual([5, 2]);
  });
});

describe('assign:-=', () => {
  it('subtracts', () => {
    expect(
      parity('var a = 10; a -= 3; var o = { n: "5" }; o["n"] -= 1; return [a, o.n];')
    ).toStrictEqual([7, 4]);
  });
});

describe('assign:*=', () => {
  it('multiplies', () => {
    expect(
      parity('var a = 4; a *= 2.5; var o = { n: 2 }; o.n *= 5; return [a, o.n];')
    ).toStrictEqual([10, 10]);
  });
});

describe('assign:/=', () => {
  it('divides', () => {
    expect(parity('var a = 9; a /= 2; return a;')).toBe(4.5);
  });
});

describe('assign:%=', () => {
  it('takes the remainder', () => {
    expect(parity('var a = 17; a %= 5; var b = -17; b %= 5; return [a, b];')).toStrictEqual([
      2, -2
    ]);
  });
});

describe('assign:<<=', () => {
  it('shifts left', () => {
    expect(parity('var a = 1; a <<= 4; return a;')).toBe(16);
  });
});

describe('assign:>>=', () => {
  it('shifts right with the sign', () => {
    expect(parity('var b = -32; b >>= 2; return b;')).toBe(-8);
  });
});

describe('assign:>>>=', () => {
  it('shifts right without the sign', () => {
    expect(parity('var c = -1; c >>>= 28; return c;')).toBe(15);
  });
});

describe('assign:&=', () => {
  it('ands the bits', () => {
    expect(parity('var a = 12; a &= 10; return a;')).toBe(8);
  });
});

describe('assign:|=', () => {
  it('ors the bits', () => {
    expect(parity('var b = 12; b |= 3; return b;')).toBe(15);
  });
});

describe('assign:^=', () => {
  it('xors the bits', () => {
    expect(parity('var c = 12; c ^= 5; return c;')).toBe(9);
  });
});
