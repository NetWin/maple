import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

describe('declarations and identifiers', () => {
  const maple = new Maple();

  describe('var', () => {
    it('declares with and without an initializer', () => {
      expect(maple.run('var a = 1; return a;').value).toBe(1);
      expect(maple.run('var a; return a;').value).toBeUndefined();
      expect(maple.run('var a = 1, b = 2; return b;').value).toBe(2);
    });

    it('hoists to the script scope and escapes blocks', () => {
      expect(maple.run('return a; var a = 1;').value).toBeUndefined();
      expect(maple.run('{ var a = 1; } return a;').value).toBe(1);
      expect(maple.run('var a = 1; var a; return a;').value).toBe(1);
    });

    it('keeps the value of a parameter it redeclares', () => {
      expect(maple.run('function f(a) { var a; return a; } return f(7);').value).toBe(7);
      expect(maple.run('function f(a) { var a = a + 1; return a; } return f(7);').value).toBe(8);
      expect(
        maple.run('const a = "outer"; function f() { return a; var a; } return f();').value
      ).toBeUndefined();
    });

    it('can be reassigned', () => {
      expect(maple.run('var a = 1; a = 2; return a;').value).toBe(2);
    });
  });

  describe('let', () => {
    it('declares, defaults to undefined and can be reassigned', () => {
      expect(maple.run('let a = 1; return a;').value).toBe(1);
      expect(maple.run('let a; return a;').value).toBeUndefined();
      expect(maple.run('let a = 1; a = 2; return a;').value).toBe(2);
    });

    it('is block scoped', () => {
      expect(maple.run('let a = 1; { let a = 2; } return a;').value).toBe(1);

      const error = runAndCatch(maple, '{ let a = 1; } return a;');
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'ReferenceError',
        message: 'a is not defined'
      });
    });

    it('throws before its declaration runs', () => {
      const error = runAndCatch(maple, 'return a;\nlet a = 1;');

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'ReferenceError',
        message: "Cannot access 'a' before initialization"
      });
      expect(error.line).toBe(1);
      expect(error.column).toBe(7);
    });
  });

  describe('const', () => {
    it('declares and reads', () => {
      expect(maple.run('const a = 1; return a;').value).toBe(1);
    });

    it('cannot be reassigned', () => {
      const error = runAndCatch(maple, 'const a = 1; a = 2;');

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'TypeError',
        message: 'Assignment to constant variable.'
      });
    });
  });

  describe('assignment', () => {
    it('evaluates to the assigned value', () => {
      expect(maple.run('let a; return a = 3;').value).toBe(3);
    });

    it('rejects undeclared names', () => {
      const error = runAndCatch(maple, 'a = 1;');

      expect(error.sandboxError).toMatchObject({
        name: 'ReferenceError',
        message: 'a is not defined'
      });
    });

    it('rejects names still in the temporal dead zone', () => {
      const error = runAndCatch(maple, 'a = 1; let a;');

      expect(error.sandboxError?.message).toBe("Cannot access 'a' before initialization");
    });
  });

  describe('reads', () => {
    it('rejects undeclared names with the position of the identifier', () => {
      const error = runAndCatch(maple, '\n  return missing;');

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'ReferenceError',
        message: 'missing is not defined'
      });
      expect(error.line).toBe(2);
      expect(error.column).toBe(9);
      expect(error.stats).toBeDefined();
    });

    it('names host-only globals as unsupported instead of undefined', () => {
      expect(runAndCatch(maple, 'return eval;').message).toBe("'eval' is not supported");
      expect(runAndCatch(maple, 'return Function;').message).toBe("'Function' is not supported");
      expect(runAndCatch(maple, 'return globalThis;').message).toBe(
        "'globalThis' is not supported"
      );
      expect(runAndCatch(maple, 'return Promise;').code).toBe('DISALLOWED_SYNTAX');
    });
  });

  it('counts declarations, identifiers and assignments as operations', () => {
    expect(maple.run('let a = 1; return a;').stats.ops).toBe(4);
    expect(maple.run('let a; a = 1; return a;').stats.ops).toBe(6);
  });
});
