import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('control flow', () => {
  describe('if', () => {
    it('branches on truthiness', () => {
      expect(run('if (1) { return "a"; } else { return "b"; }')).toBe('a');
      expect(run('if (0) { return "a"; } else { return "b"; }')).toBe('b');
      expect(run('if (0) return "a"; return "c";')).toBe('c');
      expect(run('if (0) { return 1; } else if (1) { return 2; } else { return 3; }')).toBe(2);
      expect(run('if ("") { return 1; } return 2;')).toBe(2);
      expect(run('if (list) { return 1; } return 2;', { list: [] })).toBe(1);
      expect(run('if (obj) { return 1; } return 2;', { obj: {} })).toBe(1);
    });
  });

  describe('while and do-while', () => {
    it('loops while the test holds', () => {
      expect(run('let i = 0; while (i < 3) { i++; } return i;')).toBe(3);
      expect(run('let i = 0; while (false) { i++; } return i;')).toBe(0);
    });

    it('runs a do-while body at least once', () => {
      expect(run('let i = 0; do { i++; } while (false); return i;')).toBe(1);
      expect(run('let i = 0; do { i++; } while (i < 5); return i;')).toBe(5);
    });
  });

  describe('for', () => {
    it('runs init, test and update', () => {
      expect(run('let s = 0; for (let i = 1; i <= 3; i++) { s += i; } return s;')).toBe(6);
      expect(run('let s = 0; for (var i = 0; i < 2; i++) { s += 1; } return s + i;')).toBe(4);
      expect(run('let i = 0; for (; i < 2;) { i++; } return i;')).toBe(2);
      expect(run('let i = 0; for (;;) { if (i++ === 3) { break; } } return i;')).toBe(4);
      expect(run('let i; for (i = 0; i < 2; i++) {} return i;')).toBe(2);
    });

    it('gives each iteration its own let binding', () => {
      const code =
        'let f; for (let i = 0; i < 3; i++) { if (i === 1) { f = () => i; } } return f();';

      expect(run(code)).toBe(1);
    });

    it('shares a var binding across iterations', () => {
      const code =
        'let f; for (var i = 0; i < 3; i++) { if (i === 1) { f = () => i; } } return f();';

      expect(run(code)).toBe(3);
    });

    it('keeps a const binding readable in the body', () => {
      expect(run('let s = 0; for (const n = 2; s < 4;) { s += n; } return s;')).toBe(4);
    });
  });

  describe('break and continue', () => {
    it('leave or skip the innermost loop only', () => {
      expect(run('let i = 0; while (true) { if (++i === 3) { break; } } return i;')).toBe(3);
      expect(
        run('let s = 0; for (let i = 0; i < 5; i++) { if (i % 2) { continue; } s += i; } return s;')
      ).toBe(6);
      const nested =
        'let s = 0; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 1) { break; } s++; } } return s;';
      expect(run(nested)).toBe(3);
      expect(run('let i = 0; while (true) { { { break; } } } return i;')).toBe(0);
    });

    it('do not swallow a return from inside a loop', () => {
      expect(run('function f() { for (;;) { return 7; } } return f();')).toBe(7);
      expect(run('for (let i = 0; i < 2; i++) { return i; }')).toBe(0);
    });

    it('ignore debugger', () => {
      expect(run('let n = 1; debugger; return n;')).toBe(1);
    });
  });

  describe('labels', () => {
    it('break out of an outer loop', () => {
      const code =
        'const seen = []; outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 1) { break outer; } seen.push([i, j]); } } return seen;';
      expect(run(code)).toEqual([[0, 0]]);
    });

    it('continue an outer loop', () => {
      const code =
        'const seen = []; outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 1) { continue outer; } seen.push([i, j]); } } return seen;';
      expect(run(code)).toEqual([
        [0, 0],
        [1, 0],
        [2, 0]
      ]);
    });

    it('continue every kind of loop by its label', () => {
      expect(run('let n = 0; a: while (n < 3) { n++; continue a; } return n;')).toBe(3);
      expect(run('let n = 0; a: do { n++; continue a; } while (n < 3); return n;')).toBe(3);
      expect(run('let n = 0; a: for (const x of [1, 2]) { n += x; continue a; } return n;')).toBe(
        3
      );
      expect(
        run('let s = ""; a: for (const k in { x: 1, y: 2 }) { s += k; continue a; } return s;')
      ).toBe('xy');
    });

    it('break out of a labelled block', () => {
      expect(run('let n = 1; a: { n = 2; break a; } return n;')).toBe(2);
      expect(run('let n = 1; a: { b: { break a; } n = 2; } return n;')).toBe(1);
    });

    it('carry a labelled continue through a switch', () => {
      const code =
        'const seen = []; a: for (let i = 0; i < 3; i++) { switch (i) { case 1: continue a; default: seen.push(i); } } return seen;';
      expect(run(code)).toEqual([0, 2]);
    });

    it('carry a labelled break through finally, which still runs', () => {
      const code =
        'const seen = []; a: for (;;) { try { break a; } finally { seen.push("finally"); } } return seen;';
      expect(run(code)).toEqual(['finally']);
    });

    it('let a loop bear several labels', () => {
      expect(
        run('let n = 0; a: b: for (;;) { n++; if (n === 2) { break a; } continue b; } return n;')
      ).toBe(2);
    });

    it('cost one operation as a statement', () => {
      expect(maple.run('a: { } return 1;').stats.ops).toBe(
        maple.run('{ } return 1;').stats.ops + 1
      );
    });
  });

  describe('for...of', () => {
    it('iterates arrays and strings', () => {
      expect(
        run('let s = 0; for (const n of list) { s += n; } return s;', { list: [1, 2, 3] })
      ).toBe(6);
      expect(run('let n = 0; for (const c of "héllo") { n++; } return n;')).toBe(5);
      expect(
        run('let last; for (let x of list) { last = x; } return last;', { list: [1, 2] })
      ).toBe(2);
      expect(run('let n = 0; for (const x of list) { n++; } return n;', { list: [] })).toBe(0);
    });

    it('gives each iteration its own binding', () => {
      const code = 'let f; for (const x of list) { if (x === 2) { f = () => x; } } return f();';

      expect(run(code, { list: [1, 2, 3] })).toBe(2);
    });

    it('binds var and plain identifier targets', () => {
      expect(run('for (var x of list) {} return x;', { list: [1, 2] })).toBe(2);
      expect(run('let x; for (x of list) {} return x;', { list: [1, 2] })).toBe(2);
    });

    it('rejects values that are not iterable', () => {
      const error = runAndCatch(maple, 'for (const x of obj) {}', { obj: {} });

      expect(error.sandboxError).toMatchObject({
        name: 'TypeError',
        message: 'obj is not iterable'
      });
      expect(runAndCatch(maple, 'for (const x of 5) {}').sandboxError?.message).toBe(
        '5 is not iterable'
      );
    });

    it('rejects for await', () => {
      expect(runAndCatch(maple, 'for await (const x of list) {}', { list: [] }).code).toBe(
        'DISALLOWED_SYNTAX'
      );
    });
  });

  describe('for...in', () => {
    it('visits own enumerable keys in insertion order', () => {
      expect(
        run('let k = ""; for (const key in obj) { k += key; } return k;', { obj: { b: 1, a: 2 } })
      ).toBe('ba');
      expect(
        run('let k = ""; for (const i in list) { k += i; } return k;', { list: ['x', 'y'] })
      ).toBe('01');
      expect(run('let k = ""; for (const i in "ab") { k += i; } return k;')).toBe('01');
    });

    it('skips a key deleted before its turn but no key added during the loop', () => {
      const visit = (body: string): unknown =>
        run(
          `const o = { a: 1, b: 2 }; const seen = []; for (const k in o) { seen.push(k); ${body} } return seen;`
        );

      expect(visit('delete o.b;')).toEqual(['a']);
      expect(visit('o.c = 3;')).toEqual(['a', 'b']);
      expect(visit('delete o.b; o.b = 5;')).toEqual(['a', 'b']);
      expect(
        run(
          'const a = [1, 2, 3]; const seen = []; for (const i in a) { seen.push(i); a.length = 1; } return seen;'
        )
      ).toEqual(['0']);
    });

    it('does nothing for null, undefined and other primitives', () => {
      expect(run('let n = 0; for (const k in null) { n++; } return n;')).toBe(0);
      expect(run('let n = 0; for (const k in undefined) { n++; } return n;')).toBe(0);
      expect(run('let n = 0; for (const k in 42) { n++; } return n;')).toBe(0);
    });

    it('does not expose the internals of a function value', () => {
      expect(run('let n = 0; for (const k in (() => 1)) { n++; } return n;')).toBe(0);
    });
  });

  describe('switch', () => {
    it('matches with strict equality and falls through until break', () => {
      const code =
        'let r = ""; switch (x) { case 1: r += "a"; case 2: r += "b"; break; case 3: r += "c"; } return r;';

      expect(run(code, { x: 1 })).toBe('ab');
      expect(run(code, { x: 2 })).toBe('b');
      expect(run(code, { x: 3 })).toBe('c');
      expect(run(code, { x: '1' })).toBe('');
    });

    it('takes default when nothing matches, wherever it is', () => {
      const code =
        'switch (x) { case 1: return "one"; default: return "other"; case 2: return "two"; }';

      expect(run(code, { x: 2 })).toBe('two');
      expect(run(code, { x: 9 })).toBe('other');
    });

    it('scopes declarations to the whole switch body', () => {
      expect(run('switch (1) { case 1: let a = 5; case 2: return a; }')).toBe(5);
    });

    it('lets continue reach the enclosing loop', () => {
      const code =
        'let s = 0; for (let i = 0; i < 4; i++) { switch (i) { case 1: continue; } s += i; } return s;';

      expect(run(code)).toBe(5);
    });
  });

  describe('limits', () => {
    it('stop endless loops of every shape', () => {
      const bounded = new Maple({ maxOps: 500 });

      for (const code of ['while (true) {}', 'for (;;);', 'do {} while (true);', 'for (;;) {}']) {
        const error = runAndCatch(bounded, code);
        expect(error.code).toBe('LIMIT_EXCEEDED');
        expect(error.stats?.ops).toBe(500);
      }
    });
  });
});
