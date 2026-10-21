import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AstCache } from './ast-cache.ts';
import { intrinsic } from './boundary/host.ts';
import { Maple, type MapleOptions } from './maple.ts';
import { parse } from './parse.ts';
import { runAndCatch } from './spec-helpers.ts';

// The real parser, watched, so a test can tell a cache hit from a parse
vi.mock('./parse.ts', { spy: true });

const parsed = vi.mocked(parse);

function notPositive(value: unknown): TypeError {
  return new TypeError(`astCache.maxEntries must be a positive integer, got ${String(value)}`);
}

beforeEach(() => {
  parsed.mockClear();
});

describe('AstCache', () => {
  it('returns the tree set for the code', () => {
    const cache = new AstCache(2);
    const program = parse('return 1;');
    cache.set('return 1;', program);

    expect(cache.get('return 1;')).toBe(program);
    expect(cache.get('return 2;')).toBeUndefined();
  });

  it('drops the least recently set script when full', () => {
    const cache = new AstCache(3);
    cache.set('a', parse('return "a";'));
    cache.set('b', parse('return "b";'));
    cache.set('a', parse('return "a";'));
    cache.set('c', parse('return "c";'));
    cache.set('d', parse('return "d";'));

    expect(cache.get('a')).toBeDefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(3);
  });

  it('deep-freezes every tree it keeps', () => {
    const program = parse('return a.b + /x/g.source;');
    new AstCache(1).set('code', program);
    const statement = program.body[0];

    expect(Object.isFrozen(program)).toBe(true);
    expect(Object.isFrozen(program.loc)).toBe(true);
    expect(Object.isFrozen(program.loc?.start)).toBe(true);
    expect(Object.isFrozen(program.body)).toBe(true);
    expect(Object.isFrozen(statement)).toBe(true);
    expect(statement?.type === 'ReturnStatement' && Object.isFrozen(statement.argument)).toBe(true);
  });

  it('empties on clear', () => {
    const cache = new AstCache(2);
    cache.set('return 1;', parse('return 1;'));
    cache.clear();

    expect(cache.size).toBe(0);
  });
});

describe('Maple with astCache', () => {
  it('is off by default, where clearing it does nothing', () => {
    const maple = new Maple();
    maple.run('return 1;');
    maple.run('return 1;');
    maple.clearAstCache();

    expect(parsed).toHaveBeenCalledTimes(2);
  });

  it('parses a script once, whatever data it runs against', () => {
    const maple = new Maple({ astCache: true });

    expect(maple.run('return a + 1;', { a: 1 }).value).toBe(2);
    expect(maple.run('return a + 1;', { a: 2 }).value).toBe(3);
    expect(parsed).toHaveBeenCalledTimes(1);
  });

  it('starts every run of a cached script fresh', () => {
    const maple = new Maple({ astCache: {} });
    const code = 'var seen; const before = seen; seen = 1; let n = 0; n++; return [before, n];';

    expect(maple.run(code).value).toEqual([undefined, 1]);
    expect(maple.run(code).value).toEqual([undefined, 1]);
  });

  it('keeps 200 scripts by default, dropping the least recently used', () => {
    const maple = new Maple({ astCache: true });
    for (let index = 0; index <= 200; index++) {
      maple.run(`return ${index};`);
    }
    parsed.mockClear();

    maple.run('return 200;');
    maple.run('return 1;');
    expect(parsed).not.toHaveBeenCalled();
    maple.run('return 0;');
    expect(parsed).toHaveBeenCalledTimes(1);
  });

  it('keeps as many scripts as maxEntries allows', () => {
    const maple = new Maple({ astCache: { maxEntries: 1 } });
    maple.run('return 1;');
    maple.run('return 2;');
    maple.run('return 1;');

    expect(parsed).toHaveBeenCalledTimes(3);
  });

  it('parses again after clearAstCache', () => {
    const maple = new Maple({ astCache: true });
    maple.run('return 1;');
    maple.clearAstCache();
    maple.run('return 1;');

    expect(parsed).toHaveBeenCalledTimes(2);
  });

  it('reports a script that does not parse on every run, without keeping it', () => {
    const maple = new Maple({ astCache: { maxEntries: 1 } });
    maple.run('return 1;');

    expect(runAndCatch(maple, 'return +;').code).toBe('PARSE_ERROR');
    expect(runAndCatch(maple, 'return +;').code).toBe('PARSE_ERROR');
    maple.run('return 1;');
    expect(parsed).toHaveBeenCalledTimes(3);
  });

  it('shares its entries with nested runs', () => {
    const maple = new Maple({
      astCache: true,
      globals: {
        exec: intrinsic(([code], sandbox) => sandbox.run(String(sandbox.toHost(code))).value)
      }
    });

    expect(maple.run('return 2;').value).toBe(2);
    expect(maple.run('return exec("return 2;");').value).toBe(2);
    expect(parsed).toHaveBeenCalledTimes(2);
  });

  it('rejects a astCache option that is not a boolean or a positive maxEntries', () => {
    // A JavaScript caller's view: a method compares its parameters both ways, so no cast is needed
    const untyped: { create(options: { astCache?: unknown }): Maple } = {
      create(options: MapleOptions): Maple {
        return new Maple(options);
      }
    };
    const notAnOption = new TypeError('astCache must be a boolean or a plain object');

    expect(() => new Maple({ astCache: { maxEntries: 0 } })).toThrow(notPositive(0));
    expect(() => new Maple({ astCache: { maxEntries: -1 } })).toThrow(notPositive(-1));
    expect(() => new Maple({ astCache: { maxEntries: 1.5 } })).toThrow(notPositive(1.5));
    expect(() => new Maple({ astCache: { maxEntries: Number.NaN } })).toThrow(notPositive(NaN));
    expect(() => untyped.create({ astCache: { maxEntries: '5' } })).toThrow(notPositive('5'));
    expect(() => untyped.create({ astCache: 'yes' })).toThrow(notAnOption);
    expect(() => untyped.create({ astCache: 1 })).toThrow(notAnOption);
    expect(() => untyped.create({ astCache: null })).toThrow(notAnOption);
    expect(() => untyped.create({ astCache: [] })).toThrow(notAnOption);
  });
});
