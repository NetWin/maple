import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

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
      expect(runAndCatch(maple, 'function f() { return arguments; } return f();').message).toBe(
        "'arguments' is not supported"
      );
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
