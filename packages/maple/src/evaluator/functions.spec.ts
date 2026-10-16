import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

function run(code: string): unknown {
  return new Maple().run(code).value;
}

/** The operations of calling a function with `body` and three arguments. */
function callOps(body: string): number {
  return new Maple().run(`function f() { ${body} return 1; } return f(1, 2, 3);`).stats.ops;
}

describe('functions', () => {
  const maple = new Maple();

  describe('declarations', () => {
    it('can be called after and before their declaration', () => {
      expect(maple.run('function f() { return 1; } return f();').value).toBe(1);
      expect(maple.run('return f(); function f() { return 2; }').value).toBe(2);
    });

    it('are block scoped', () => {
      expect(maple.run('{ function f() { return 1; } return f(); }').value).toBe(1);

      const error = runAndCatch(maple, '{ function f() {} } return f();');
      expect(error.sandboxError).toMatchObject({
        name: 'ReferenceError',
        message: 'f is not defined'
      });
    });

    it('win over a var of the same name inside a function body', () => {
      const code =
        'function outer() { var f; function f() { return 1; } return f(); } return outer();';

      expect(maple.run(code).value).toBe(1);
    });
  });

  describe('expressions', () => {
    it('can be stored and called', () => {
      expect(maple.run('const f = function () { return 1; }; return f();').value).toBe(1);
      expect(maple.run('const f = () => 1; return f();').value).toBe(1);
      expect(maple.run('const f = () => { return 2; }; return f();').value).toBe(2);
      expect(maple.run('return (() => 3)();').value).toBe(3);
    });

    it('bind the name of a named function expression inside the function only', () => {
      expect(maple.run('const g = function f() { return f; }; return g();').value).toBeUndefined();

      const error = runAndCatch(maple, 'const g = function f() {}; return f;');
      expect(error.sandboxError?.message).toBe('f is not defined');
    });

    it('evaluate an arrow with an expression body to that expression', () => {
      expect(maple.run('const id = (x) => x; return id(4);').value).toBe(4);
    });
  });

  describe('parameters', () => {
    it('bind positional arguments and default missing ones to undefined', () => {
      expect(maple.run('function f(a, b) { return b; } return f(1, 2);').value).toBe(2);
      expect(maple.run('function f(a, b) { return b; } return f(1);').value).toBeUndefined();
      expect(maple.run('function f(a) { return a; } return f(1, 2, 3);').value).toBe(1);
    });

    it('evaluate defaults only for undefined arguments, in parameter order', () => {
      expect(maple.run('function f(a, b = 2) { return b; } return f(1);').value).toBe(2);
      expect(maple.run('function f(a, b = 2) { return b; } return f(1, undefined);').value).toBe(2);
      expect(maple.run('function f(a, b = 2) { return b; } return f(1, null);').value).toBe(null);
      expect(maple.run('function f(a, b = a) { return b; } return f(7);').value).toBe(7);
    });

    it('collect the rest into a fresh mutable array', () => {
      expect(maple.run('function f(a, ...r) { return r; } return f(1, 2, 3);').value).toEqual([
        2, 3
      ]);
      expect(maple.run('const f = (...r) => r; return f();').value).toEqual([]);
    });

    it('are plain mutable bindings', () => {
      expect(maple.run('function f(a) { a = 2; return a; } return f(1);').value).toBe(2);
    });
  });

  describe('closures', () => {
    it('see later changes to captured bindings', () => {
      const code = 'let a = 1; function g() { return a; } a = 2; return g();';

      expect(maple.run(code).value).toBe(2);
    });

    it('keep their scope alive after the outer function returned', () => {
      const code =
        'function outer() { let x = 5; return function () { return x; }; } return outer()();';

      expect(maple.run(code).value).toBe(5);
    });

    it('get a fresh scope per call', () => {
      const code = 'function f(a) { let b = a; return b; } f(1); return f(2);';

      expect(maple.run(code).value).toBe(2);
    });

    it('read globals', () => {
      expect(maple.run('function f() { return name; } return f();', { name: 'x' }).value).toBe('x');
    });
  });

  describe('calls', () => {
    it('reject calling a non-function with the name of the callee', () => {
      const error = runAndCatch(maple, 'let a = 1; a();');

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'TypeError',
        message: 'a is not a function'
      });
      expect(error.column).toBe(11);
    });

    it('count the call nesting in the stats', () => {
      const code = 'function a() { return b(); } function b() { return 1; } return a();';

      expect(maple.run(code).stats.maxDepth).toBe(2);
      expect(maple.run('return 1;').stats.maxDepth).toBe(0);
    });

    it('abort runaway recursion with LIMIT_EXCEEDED', () => {
      const error = runAndCatch(
        new Maple({ maxDepth: 10 }),
        'function f() { return f(); }\nreturn f();'
      );

      expect(error.code).toBe('LIMIT_EXCEEDED');
      expect(error.message).toBe('Call depth limit of 10 exceeded');
      expect(error.line).toBe(1);
      expect(error.stats?.maxDepth).toBe(10);
    });
  });

  describe('arguments', () => {
    it('holds every argument, also beyond the parameters', () => {
      expect(
        run(
          'function f(a) { return [arguments.length, arguments[0], arguments[2]]; } return f(1, 2, 3);'
        )
      ).toEqual([3, 1, 3]);
      expect(run('function f(a, b) { return arguments.length; } return f();')).toBe(0);
    });

    it('is an object with the indices as its keys, not an array', () => {
      const code =
        'function f() { return [Array.isArray(arguments), typeof arguments, Object.keys(arguments), JSON.stringify(arguments)]; } return f("a", "b");';
      expect(run(code)).toEqual([false, 'object', ['0', '1'], '{"0":"a","1":"b"}']);
    });

    it('converts to [object Arguments]', () => {
      expect(
        run('function f() { return [String(arguments), arguments.toString()]; } return f();')
      ).toEqual(['[object Arguments]', '[object Arguments]']);
    });

    it('is iterable', () => {
      expect(run('function f() { return [...arguments]; } return f(1, 2);')).toEqual([1, 2]);
      expect(
        run(
          'function f() { let s = 0; for (const x of arguments) { s += x; } return s; } return f(1, 2);'
        )
      ).toBe(3);
    });

    it('is a copy, unmapped from the parameters as in strict mode', () => {
      expect(
        run('function f(a) { a = 2; arguments[0] = 3; return [a, arguments[0]]; } return f(1);')
      ).toEqual([2, 3]);
      expect(
        run(
          'function f() { arguments.length = 1; return [arguments.length, Object.keys(arguments)]; } return f(1, 2);'
        )
      ).toEqual([1, ['0', '1']]);
    });

    it("is the enclosing function's inside an arrow function", () => {
      expect(run('function f() { const g = () => arguments[0]; return g(2); } return f(1);')).toBe(
        1
      );
    });

    it('is visible to default parameters', () => {
      expect(run('function f(a, b = arguments.length) { return b; } return f(1);')).toBe(1);
    });

    it('answers in, hasOwnProperty and getOwnPropertyNames like an object', () => {
      const code =
        'function f() { return ["0" in arguments, "2" in arguments, "length" in arguments, arguments.hasOwnProperty("1"), Object.getOwnPropertyNames(arguments)]; } return f("a", "b");';
      expect(run(code)).toEqual([true, false, true, true, ['0', '1', 'length']]);
    });

    it('can be written to, deleted from and extended', () => {
      const code =
        'function f() { arguments[0] = "x"; delete arguments[1]; arguments.extra = 1; return [arguments[0], 1 in arguments, arguments.extra, Object.keys(arguments)]; } return f("a", "b");';
      expect(run(code)).toEqual(['x', false, 1, ['0', 'extra']]);
    });

    it('is visited by for...in and copied by spread, rest and the Object functions', () => {
      const code =
        'function f() { const keys = []; for (const k in arguments) { keys.push(k); } const { 0: first, ...rest } = arguments; return [keys, { ...arguments }, first, rest, Object.values(arguments), Object.entries(arguments), Object.assign({}, arguments)]; } return f("a", "b");';
      expect(run(code)).toEqual([
        ['0', '1'],
        { 0: 'a', 1: 'b' },
        'a',
        { 1: 'b' },
        ['a', 'b'],
        [
          ['0', 'a'],
          ['1', 'b']
        ],
        { 0: 'a', 1: 'b' }
      ]);
    });

    it('can be frozen', () => {
      const code =
        'function f() { Object.freeze(arguments); let error; try { arguments[0] = 2; } catch (e) { error = e.name; } return [Object.isFrozen(arguments), arguments[0], error]; } return f(1);';
      expect(run(code)).toEqual([true, 1, 'TypeError']);
    });

    it('serializes and leaves the sandbox as an object of its indices', () => {
      expect(
        run('function f() { return JSON.stringify({ args: arguments }); } return f(1, [2]);')
      ).toBe('{"args":{"0":1,"1":[2]}}');
      expect(run('function f() { return arguments; } return f(1, "a");')).toEqual({ 0: 1, 1: 'a' });
      const seen: Array<unknown> = [];
      new Maple().run('function f() { host(arguments); } f(1, 2);', {
        host: (value: unknown) => seen.push(value)
      });
      expect(seen).toEqual([{ 0: 1, 1: 2 }]);
    });

    it('throws a TypeError on callee', () => {
      expect(
        runAndCatch(maple, 'function f() { return arguments.callee; } return f();').sandboxError
      ).toMatchObject({ name: 'TypeError' });
    });

    it('costs one operation per argument on its first read, and nothing unread', () => {
      // `0;` costs what `arguments;` costs as an expression, so the rest is building the object
      expect(callOps('arguments;') - callOps('0;')).toBe(3);
      expect(callOps('arguments; arguments;') - callOps('arguments; 0;')).toBe(0);
      expect(callOps('if (false) { arguments; }') - callOps('if (false) { 0; }')).toBe(0);
    });
  });

  describe('length and name of built-in functions', () => {
    it('are the ones the language gives them', () => {
      const code =
        'return [parseInt.length, Math.max.length, "a".replace.length, [].push.length, Date.UTC.length, Object.keys.length, [].reduce.length];';
      expect(maple.run(code).value).toEqual([2, 2, 2, 1, 7, 1, 1]);
      expect(maple.run('return [Math.max.name, "a".trim.name, Object.keys.name];').value).toEqual([
        'max',
        'trim',
        'keys'
      ]);
    });

    it('are there on callable globals but not on namespaces', () => {
      expect(
        maple.run('return [Array.length, Date.length, Error.length, String.length, Array.name];')
          .value
      ).toEqual([1, 7, 1, 1, 'Array']);
      expect(maple.run('return [Math.length, JSON.name];').value).toEqual([undefined, undefined]);
    });

    it('are written out for the methods TypeScript has no typing for', () => {
      expect(
        maple.run(
          'return [new Date(0).getYear.length, new Date(0).setYear.length, "a".substr.length, [].values().next.length];'
        ).value
      ).toEqual([0, 1, 2, 0]);
    });

    it('stay hidden on host functions', () => {
      expect(
        maple.run('return [typeof host.length, typeof host.name];', { host: () => 1 }).value
      ).toEqual(['undefined', 'undefined']);
    });

    it('cannot be written', () => {
      expect(runAndCatch(maple, 'Math.max.name = "x";').sandboxError?.name).toBe('TypeError');
    });
  });

  describe('length and name', () => {
    it('count the parameters before the first default or rest parameter', () => {
      expect(
        maple.run(
          'return [((a, b) => 1).length, ((a, b = 1, c) => 1).length, ((a, ...r) => 1).length];'
        ).value
      ).toEqual([2, 1, 1]);
    });

    it('take the name of a declaration or a named expression', () => {
      expect(
        maple.run('function f() {} const g = function h() {}; return [f.name, g.name];').value
      ).toEqual(['f', 'h']);
    });

    it('infer the name of an anonymous function from where it is bound', () => {
      const code =
        'const a = () => 1; let b; b = function () {}; const o = { c: () => 1, ["d"]: () => 1 }; function f(e = () => 1) { return e.name; } return [a.name, b.name, o.c.name, o.d.name, f(), (() => 1).name];';
      expect(maple.run(code).value).toEqual(['a', 'b', 'c', 'd', 'e', '']);
    });

    it('infer the name from a logical assignment too, but not from a member', () => {
      const code =
        'let a; let b = 1; let c = null; a ||= () => 1; b &&= () => 1; c ??= function () {}; const o = {}; o.d = () => 1; return [a.name, b.name, c.name, o.d.name];';
      expect(maple.run(code).value).toEqual(['a', 'b', 'c', '']);
    });

    it('cannot be written', () => {
      expect(runAndCatch(maple, 'const f = () => 1; f.name = "g";').sandboxError?.name).toBe(
        'TypeError'
      );
    });
  });

  describe('toString and valueOf', () => {
    it('convert any function to the placeholder and give it back itself', () => {
      expect(
        maple.run(
          'const f = () => 1; return [f.toString(), Math.max.toString(), f.valueOf() === f];'
        ).value
      ).toEqual(['[function]', '[function]', true]);
    });
  });

  describe('rejected at creation', () => {
    it('throws for async functions even when they are never called', () => {
      expect(runAndCatch(maple, 'async function f() {}\nreturn 1;')).toMatchObject({
        code: 'DISALLOWED_SYNTAX',
        message: "'async' is not supported",
        line: 1,
        column: 0
      });
      expect(runAndCatch(maple, 'const f = async () => 1;\nreturn 1;').message).toBe(
        "'async' is not supported"
      );
      expect(runAndCatch(maple, 'const f = async function () {};').message).toBe(
        "'async' is not supported"
      );
    });

    it('throws for generators', () => {
      expect(runAndCatch(maple, 'function* g() {}').message).toBe('generators are not supported');
    });

    it('throws for this and arguments only when reached', () => {
      expect(maple.run('const f = () => this; return 1;').value).toBe(1);
      expect(runAndCatch(maple, 'return (() => this)();').message).toBe("'this' is not supported");
      expect(runAndCatch(maple, 'return arguments;').message).toBe("'arguments' is not supported");
    });

    it('reports a script-level arguments and the blocked names as undefined to typeof', () => {
      expect(
        maple.run('return [typeof arguments, typeof window, typeof eval, typeof setTimeout];').value
      ).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);
    });

    it('names new.target and import.meta in the error', () => {
      expect(runAndCatch(maple, 'function f() { return new.target; } return f();').message).toBe(
        "'new.target' is not supported"
      );
      expect(runAndCatch(maple, 'return import.meta;').message).toBe(
        "'import.meta' is not supported"
      );
    });
  });

  describe('as values', () => {
    it('never leave the sandbox', () => {
      expect(maple.run('return () => 1;').value).toBeUndefined();
      expect(maple.run('function f(...r) { return r; } return f(1, () => 2);').value).toEqual([
        1,
        undefined
      ]);
    });
  });

  it('counts the declaration, the call and the body as operations', () => {
    expect(maple.run('function f() { return 1; } return f();').stats.ops).toBe(6);
  });
});
