import { describe, expect, it } from 'vitest';
import { Maple } from './maple.ts';
import { parse } from './parse.ts';
import { runAndCatch, type UntypedRunner } from './spec-helpers.ts';

/** The operations a run costs with three-element data beyond what it costs with empty data. */
function extra(code: string): number {
  const maple = new Maple();
  return (
    maple.run(code, { list: [1, 2, 3], text: 'abc' }).stats.ops -
    maple.run(code, { list: [], text: '' }).stats.ops
  );
}

describe('Maple.run', () => {
  const maple = new Maple();

  describe('return values', () => {
    it('returns literal values', () => {
      expect(maple.run('return 42;').value).toBe(42);
      expect(maple.run('return "hi";').value).toBe('hi');
      expect(maple.run('return true;').value).toBe(true);
      expect(maple.run('return null;').value).toBe(null);
    });

    it('returns undefined without a return or with a bare return', () => {
      expect(maple.run('').value).toBeUndefined();
      expect(maple.run('1;').value).toBeUndefined();
      expect(maple.run('return;').value).toBeUndefined();
    });

    it('stops at the first return', () => {
      expect(maple.run('return 1; return 2;').value).toBe(1);
    });

    it('returns from inside a block', () => {
      expect(maple.run('{ return 1; }').value).toBe(1);
    });

    it('rejects code that is not a string with a plain TypeError before running', () => {
      const untyped: UntypedRunner = maple;
      for (const code of [parse('return 7;'), 42, undefined]) {
        expect(() => untyped.run(code)).toThrow(new TypeError('code must be a string'));
      }
    });
  });

  describe('stats', () => {
    it('counts one operation per evaluated statement and expression', () => {
      expect(maple.run('return 1;').stats.ops).toBe(2);
      expect(maple.run('1; 2; return 3;').stats.ops).toBe(6);
    });

    it('reports depth zero for a script without calls and a finite duration', () => {
      const { stats } = maple.run('return 1;');

      expect(stats.maxDepth).toBe(0);
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stats.durationMs)).toBe(true);
    });

    it('starts a fresh budget for every run', () => {
      maple.run('1; 2; 3;');

      expect(maple.run('return 1;').stats.ops).toBe(2);
    });
  });

  describe('limits', () => {
    it('throws LIMIT_EXCEEDED once the operation budget is spent', () => {
      const error = runAndCatch(new Maple({ maxOps: 3 }), '1; 2; return 3;');

      expect(error.code).toBe('LIMIT_EXCEEDED');
      expect(error.message).toBe('Operation limit of 3 exceeded');
      expect(error.line).toBe(1);
      expect(error.stats?.ops).toBe(3);
    });

    it('charges one operation per element copied and per slot an array grows', () => {
      expect(extra('return [...list];')).toBe(3);
      expect(extra('return Math.max(...list);')).toBe(3);
      expect(extra('return { ...text };')).toBe(3);
      expect(extra('const [...rest] = list;')).toBe(3);
      expect(extra('const { ...rest } = list;')).toBe(3);
      expect(extra('for (const k in text) {}')).toBe(6);
      expect(extra('return Array.from(list);')).toBe(3);

      const counting = new Maple();
      const ops = (code: string): number => counting.run(code).stats.ops;
      expect(ops('const a = []; a.length = 10;') - ops('const a = []; a.length = 0;')).toBe(10);
      expect(ops('const a = []; a[9] = 1;') - ops('const a = []; a[0] = 1;')).toBe(9);
      expect(ops('const a = [1, 2, 3]; a.length = 1;')).toBe(
        ops('const a = [1, 2, 3]; a.length = 3;')
      );
    });

    it('sets an array length as JavaScript does, with the sandbox conversion', () => {
      expect(maple.run('const a = [1, 2, 3]; a.length = "1"; return a;').value).toEqual([1]);
      expect(maple.run('const a = []; a.length = [2]; return a.length;').value).toBe(2);
      for (const length of ['-1', '1.5', '2 ** 32', 'NaN']) {
        expect(runAndCatch(maple, `const a = []; a.length = ${length};`).sandboxError).toEqual({
          name: 'RangeError',
          message: 'Invalid array length',
          stack: expect.any(String)
        });
      }
    });
  });

  describe('unsupported syntax', () => {
    it('throws DISALLOWED_SYNTAX with a readable name and the position when reached', () => {
      const reached = runAndCatch(maple, '\n  class A {}\nreturn 1;');
      expect(reached.code).toBe('DISALLOWED_SYNTAX');
      expect(reached.message).toBe("'class' is not supported");
      expect(reached.line).toBe(2);
      expect(reached.column).toBe(2);
      expect(reached.stats).toBeDefined();
    });

    it('does not reject syntax the script never reaches', () => {
      expect(maple.run('return 1;\nclass A {}').value).toBe(1);
    });

    it('rejects bigint literals', () => {
      const error = runAndCatch(maple, 'return 1n;');

      expect(error.code).toBe('DISALLOWED_SYNTAX');
      expect(error.message).toBe('bigint literals are not supported');
    });

    it('rejects module declarations', () => {
      expect(runAndCatch(maple, 'import x from "y";').message).toBe("'import' is not supported");
      expect(runAndCatch(maple, 'export const a = 1;').message).toBe("'export' is not supported");
    });
  });

  describe('parse errors', () => {
    it('rethrows PARSE_ERROR without stats', () => {
      const error = runAndCatch(maple, 'return +;');

      expect(error.code).toBe('PARSE_ERROR');
      expect(error.stats).toBeUndefined();
    });
  });

  describe('data argument', () => {
    it('accepts undefined, a plain object and a JSON string of a plain object', () => {
      expect(() => maple.run('return 1;')).not.toThrow();
      expect(() => maple.run('return 1;', {})).not.toThrow();
      expect(() => maple.run('return 1;', Object.create(null))).not.toThrow();
      expect(() => maple.run('return 1;', '{"a":1}')).not.toThrow();
    });

    it('rejects anything else with a plain TypeError before running', () => {
      expect(() => maple.run('return 1;', 42)).toThrow(TypeError);
      expect(() => maple.run('return 1;', [])).toThrow(TypeError);
      expect(() => maple.run('return 1;', null)).toThrow(TypeError);
      expect(() => maple.run('return 1;', new Date())).toThrow(TypeError);
      expect(() => maple.run('return 1;', '[1]')).toThrow(TypeError);
      expect(() => maple.run('return 1;', 'not json')).toThrow(TypeError);
    });

    it('rejects data nested deeper than 1000 levels with a plain TypeError', () => {
      const levels = 20_000;
      let deep: unknown = [];
      for (let i = 0; i < levels; i++) {
        deep = [deep];
      }
      // Built by hand, since the host's own JSON.stringify overflows at this depth
      const json = `{"v":${'['.repeat(levels + 1)}${']'.repeat(levels + 1)}}`;

      expect(() => maple.run('return 1;', { v: deep })).toThrow(/nested deeper than 1000 levels$/);
      expect(() => maple.run('return 1;', json)).toThrow(/nested deeper than 1000 levels$/);
      expect(() => maple.run('return 1;', json)).toThrow(TypeError);
      expect(() => new Maple({ globals: { v: deep } })).toThrow(
        new TypeError('Unsupported value at globals: nested deeper than 1000 levels')
      );
    });
  });
});

describe('new Maple', () => {
  it('rejects limits that are not positive integers', () => {
    expect(() => new Maple({ maxOps: 0 })).toThrow(TypeError);
    expect(() => new Maple({ maxOps: 1.5 })).toThrow(TypeError);
    expect(() => new Maple({ maxDepth: -1 })).toThrow(TypeError);
    expect(() => new Maple({ maxDepth: Number.NaN })).toThrow(TypeError);
  });
});
