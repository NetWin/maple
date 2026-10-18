import { describe, expect, it } from 'vitest';
import { exposed } from './boundary/host.ts';
import { Maple } from './maple.ts';
import { runAndCatch } from './spec-helpers.ts';

function sandboxError(
  maple: Maple,
  code: string,
  data?: unknown
): { name: string; message: string } | undefined {
  return runAndCatch(maple, code, data).sandboxError;
}

const double = (n: unknown): number => Number(n) * 2;
const triple = (n: unknown): number => Number(n) * 3;
const greet = (who: unknown): string => `hi ${String(who)}`;
const upper = (s: unknown): string => String(s).toUpperCase();
const one = (): number => 1;

describe('host functions', () => {
  it('are callable from every globals layer and from data', () => {
    const maple = new Maple({ globals: { double } });

    expect(maple.run('return double(21);').value).toBe(42);
    expect(maple.run('return triple(2);', undefined, { globals: { triple } }).value).toBe(6);
    expect(maple.run('return greet("x");', { greet }).value).toBe('hi x');
    expect(maple.run('return text.upper("a");', { text: { upper } }).value).toBe('A');
  });

  it('look like functions to the script and never leave it', () => {
    const maple = new Maple({ globals: { f: one } });

    expect(maple.run('return typeof f;').value).toBe('function');
    expect(maple.run('return f.name;').value).toBeUndefined();
    expect(maple.run('return f + "";').value).toBe('[function]');
    expect(maple.run('return f;').value).toBeUndefined();
    expect(maple.run('return [f, { f }];').value).toEqual([undefined, { f: undefined }]);
    expect(maple.run('const g = f; return g();').value).toBe(1);
    expect(runAndCatch(maple, 'new f();').code).toBe('DISALLOWED_SYNTAX');
    expect(maple.run('f.x = 1; return f.x;').value).toBe(1);
    expect(maple.run('return f.x;').value).toBeUndefined();
  });

  it('receive copies of the arguments, never references', () => {
    const seen: Array<unknown> = [];
    const take = (...args: Array<unknown>): number => {
      seen.push(...args);
      const [first] = args;
      if (typeof first === 'object' && first !== null) {
        Object.assign(first, { touched: true });
      }
      return args.length;
    };
    const maple = new Maple({ globals: { take } });

    expect(
      maple.run('const o = { a: [1] }; take(o, 2, "s", null, undefined); return o;').value
    ).toEqual({ a: [1] });
    expect(seen).toEqual([{ a: [1], touched: true }, 2, 's', null, undefined]);
    expect(Object.isFrozen(seen[0])).toBe(false);
    expect(maple.run('return take(input);', { input: { k: 1 } }).value).toBe(1);
    expect(seen.at(-1)).toEqual({ k: 1, touched: true });
  });

  it('receive natives for wrappers', () => {
    const seen: Array<unknown> = [];
    const take = (value: unknown): void => {
      seen.push(value);
    };
    const maple = new Maple({ globals: { take } });

    maple.run('take(new Date(0)); take(/a/g); take(new Map([[1, 2]])); take(new Set([3]));');

    expect(seen[0]).toEqual(new Date(0));
    expect(seen[1]).toEqual(/a/g);
    expect(seen[2]).toEqual(new Map([[1, 2]]));
    expect(seen[3]).toEqual(new Set([3]));
  });

  it('refuse functions and iterators as arguments', () => {
    const maple = new Maple({ globals: { take: one } });

    expect(sandboxError(maple, 'take(() => 1);')).toMatchObject({
      name: 'TypeError',
      message: 'A function cannot be passed to the host'
    });
    expect(sandboxError(maple, 'take({ nested: [() => 1] });')?.name).toBe('TypeError');
    expect(sandboxError(maple, 'take(take);')?.name).toBe('TypeError');
    expect(sandboxError(maple, 'take([].values());')?.message).toBe(
      'An iterator cannot be passed to the host'
    );
    expect(maple.run('try { take(() => 1); } catch (e) { return "caught"; }').value).toBe('caught');
  });

  it('refuse cyclic arguments but keep shared references', () => {
    const seen: Array<unknown> = [];
    const take = (value: unknown): void => {
      seen.push(value);
    };
    const maple = new Maple({ globals: { take } });

    expect(sandboxError(maple, 'const a = []; a.push(a); take(a);')).toMatchObject({
      name: 'TypeError',
      message: 'A cyclic value cannot be passed to the host'
    });
    expect(sandboxError(maple, 'const o = {}; o.m = new Map([[1, { o }]]); take([o]);')?.name).toBe(
      'TypeError'
    );
    expect(seen).toEqual([]);

    maple.run('const x = { n: 1 }; take([x, x]);');
    const [shared] = seen;
    expect(Array.isArray(shared) && shared[0] === shared[1]).toBe(true);
  });

  it('refuse arguments nested deeper than 1000 levels with a catchable RangeError', () => {
    const seen: Array<unknown> = [];
    const take = (value: unknown): void => {
      seen.push(value);
    };
    const maple = new Maple({ globals: { take } });
    const build = 'let v = []; for (let i = 0; i < 1001; i++) { v = [v]; }';
    const message = 'A value nested deeper than 1000 levels cannot be passed to the host';

    expect(
      maple.run(
        `${build} try { take(v); } catch (e) { return [e instanceof RangeError, e.message]; }`
      ).value
    ).toEqual([true, message]);
    expect(runAndCatch(maple, `${build}\ntake(v);`)).toMatchObject({
      code: 'RUNTIME_ERROR',
      line: 2,
      column: 0,
      sandboxError: { name: 'RangeError', message }
    });
    expect(seen).toEqual([]);
  });

  it('hand their results to the script as mutable sandbox values', () => {
    const shared = { n: 1 };
    const maple = new Maple({
      globals: {
        object: (): object => shared,
        when: (): Date => new Date(0),
        lookup: (): Map<string, Array<number>> => new Map([['k', [1]]]),
        nothing: (): undefined => undefined,
        pattern: (): RegExp => /x/
      }
    });

    expect(maple.run('const o = object(); o.n = 2; return o;').value).toEqual({ n: 2 });
    expect(shared.n).toBe(1);
    expect(maple.run('return when().getTime();').value).toBe(0);
    expect(maple.run('const d = when(); d.setTime(5); return d.getTime();').value).toBe(5);
    expect(maple.run('const m = lookup(); m.set("j", 2); return m.size;').value).toBe(2);
    expect(maple.run('return nothing();').value).toBeUndefined();
    expect(maple.run('return pattern().test("x");').value).toBe(true);
  });

  it('report a result the sandbox cannot hold as an internal error', () => {
    class Thing {
      public readonly id = 1;
    }
    const maple = new Maple({
      globals: {
        fn: (): (() => number) => one,
        thing: (): Thing => new Thing(),
        promise: (): Promise<number> => Promise.resolve(1),
        nested: (): object => ({ deep: { bad: Symbol('s') } })
      }
    });

    expect(runAndCatch(maple, 'fn();')).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'fn returned a value the sandbox cannot hold: Unsupported value at fn(): function'
    });
    expect(runAndCatch(maple, 'thing();').code).toBe('INTERNAL_ERROR');
    expect(runAndCatch(maple, 'promise();').code).toBe('INTERNAL_ERROR');
    expect(runAndCatch(maple, 'nested();').message).toContain('nested().deep.bad');
    expect(runAndCatch(maple, 'try { fn(); } catch (e) { return "caught"; }').code).toBe(
      'INTERNAL_ERROR'
    );
  });

  it('report a result nested deeper than 1000 levels as an internal error', () => {
    let deep: unknown = [];
    for (let i = 0; i < 20_000; i++) {
      deep = [deep];
    }
    const maple = new Maple({ globals: { f: (): unknown => deep } });

    const error = runAndCatch(maple, 'try { f(); } catch (e) { return "caught"; }');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toMatch(
      /^f returned a value the sandbox cannot hold: Unsupported value at f\(\)(\[0\]){1001}: nested deeper than 1000 levels$/
    );
  });

  it('turn host exceptions into catchable errors that say only that the host failed', () => {
    const maple = new Maple({
      globals: {
        boom: (): never => {
          throw new RangeError('secret 10.0.3.7');
        },
        text: (): never => {
          throw 'secret';
        }
      }
    });

    for (const call of ['boom()', 'text()']) {
      expect(
        maple.run(
          `try { ${call}; } catch (e) { return [e.name, e.message, e instanceof RangeError, e instanceof Error, e.stack]; }`
        ).value
      ).toEqual([
        'Error',
        'A host function failed',
        false,
        true,
        'Error: A host function failed\n    at <script> (1:6)'
      ]);
    }
    const error = runAndCatch(maple, 'boom();');
    expect(error).toMatchObject({
      code: 'RUNTIME_ERROR',
      message: 'A host function failed',
      sandboxError: { name: 'Error', message: 'A host function failed' }
    });
    expect(JSON.stringify(error.sandboxError)).not.toContain('secret');
  });

  it('show the script the name and message of an exception marked with exposed', () => {
    const maple = new Maple({
      globals: {
        boom: (): never => {
          throw exposed(new RangeError('too far'));
        }
      }
    });

    expect(
      maple.run(
        'try { boom(); } catch (e) { return [e.name, e.message, e instanceof RangeError, e instanceof Error]; }'
      ).value
    ).toEqual(['RangeError', 'too far', true, true]);
    expect(maple.run('try { boom(); } catch (e) { return e.stack; }').value).toBe(
      'RangeError: too far\n    at <script> (1:6)'
    );
    expect(runAndCatch(maple, 'boom();')).toMatchObject({
      code: 'RUNTIME_ERROR',
      message: 'too far',
      sandboxError: { name: 'RangeError', message: 'too far' }
    });
  });

  it('hand the host exception back as cause, a copy with only name, message and stack', () => {
    const original = Object.assign(new RangeError('secret 10.0.3.7'), { code: 'E_SECRET' });
    const maple = new Maple({
      globals: {
        boom: (): never => {
          throw original;
        },
        shown: (): never => {
          throw exposed(original);
        }
      }
    });

    for (const code of ['boom();', 'shown();', 'try { boom(); } catch (e) { throw e; }']) {
      const cause = runAndCatch(maple, code).cause;
      expect(cause).toBeInstanceOf(Error);
      expect(cause).not.toBe(original);
      expect(cause).toMatchObject({
        name: 'RangeError',
        message: 'secret 10.0.3.7',
        stack: original.stack
      });
      expect(cause).not.toHaveProperty('code');
    }
    expect(runAndCatch(maple, 'try { boom(); } catch (e) { throw new Error("mine"); }').cause).toBe(
      undefined
    );
  });

  it('cap the cause like an uncaught error, and leave it out for a thrown non-string', () => {
    const maple = new Maple({
      globals: {
        long: (): never => {
          throw new RangeError('x'.repeat(100_000));
        },
        text: (): never => {
          throw 'y'.repeat(100_000);
        },
        object: (): never => {
          throw { toString: (): string => 'z'.repeat(100_000) };
        },
        stackless: (): never => {
          const error = new Error('m');
          delete error.stack;
          throw error;
        }
      }
    });

    expect(runAndCatch(maple, 'long();').cause).toMatchObject({
      name: 'RangeError',
      message: `${'x'.repeat(9_999)}…`,
      stack: expect.stringMatching(/^RangeError: x{9987}…$/)
    });
    expect(runAndCatch(maple, 'text();').cause).toMatchObject({
      message: `${'y'.repeat(9_999)}…`
    });
    expect(runAndCatch(maple, 'object();').cause).toBe(undefined);
    expect(runAndCatch(maple, 'stackless();').cause).not.toHaveProperty('stack');
  });

  it('cost one operation per call', () => {
    const maple = new Maple({ globals: { f: one } });

    expect(maple.run('return f();').stats.ops).toBe(3);
  });
});
