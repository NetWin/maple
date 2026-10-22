import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { errorMessage, runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: object): unknown {
  return maple.run(code, data).value;
}

describe('tagged templates', () => {
  it('calls the tag with the strings and the substitutions', () => {
    expect(run('function tag(s, ...v) { return [s, v]; } return tag`a${1}b${2}c`;')).toEqual([
      ['a', 'b', 'c'],
      [1, 2]
    ]);
    expect(run('function tag(s, ...v) { return [s, v]; } return tag`plain`;')).toEqual([
      ['plain'],
      []
    ]);
    expect(run('function tag(s, ...v) { return [s, v]; } return tag``;')).toEqual([[''], []]);
    expect(run('function tag(s, ...v) { return [s, v]; } return tag`${1}${2}`;')).toEqual([
      ['', '', ''],
      [1, 2]
    ]);
    expect(run('const tag = (s, ...v) => v.length; return tag`${1}${2}${3}`;')).toBe(3);
  });

  it('passes the substitutions as values, not strings', () => {
    expect(
      run('const obj = {}; function tag(s, v) { return v === obj; } return tag`${obj}`;')
    ).toBe(true);
    expect(run('function tag(s, v) { return typeof v; } return tag`${[1, 2]}`;')).toBe('object');
  });

  it('gives the raw text under raw', () => {
    expect(
      run('function tag(s) { return [s[0], s.raw[0], s.length, s.raw.length]; } return tag`a\\nb`;')
    ).toEqual(['a\nb', 'a\\nb', 1, 1]);
    expect(run('function tag(s) { return s.raw; } return tag`x${1}y`;')).toEqual(['x', 'y']);
  });

  it('leaves undefined for an invalid escape, which only a tagged template allows', () => {
    expect(run('function tag(s) { return [s[0], s.raw[0]]; } return tag`\\unicode`;')).toEqual([
      undefined,
      '\\unicode'
    ]);
    expect(run('function tag(s) { return 0 in s; } return tag`\\unicode`;')).toBe(true);
    expect(runAndCatch(maple, 'return `\\unicode`;').code).toBe('PARSE_ERROR');
  });

  it('freezes the strings and their raw text', () => {
    expect(
      run(
        'function tag(s) { return [Object.isFrozen(s), Object.isFrozen(s.raw), Object.keys(s), "raw" in s]; } return tag`x`;'
      )
    ).toEqual([true, true, ['0'], true]);
    expect(errorMessage(maple, 'function tag(s) { s[0] = "y"; } tag`x`;')).toBe(
      "Cannot assign to read-only property '0'"
    );
    expect(runAndCatch(maple, 'function tag(s) { s.push("y"); } tag`x`;').sandboxError?.name).toBe(
      'TypeError'
    );
    expect(runAndCatch(maple, 'function tag(s) { s.raw = []; } tag`x`;').sandboxError?.name).toBe(
      'TypeError'
    );
    expect(
      runAndCatch(maple, 'function tag(s) { s.raw[0] = "y"; } tag`x`;').sandboxError?.name
    ).toBe('TypeError');
    expect(runAndCatch(maple, 'function tag(s) { delete s[0]; } tag`x`;').sandboxError?.name).toBe(
      'TypeError'
    );
  });

  it('hands a site the same strings array on every evaluation', () => {
    expect(
      run(
        'function tag(s) { return s; } const seen = []; for (let i = 0; i < 2; i++) { seen.push(tag`x`); } return [seen[0] === seen[1], seen[0].raw === seen[1].raw];'
      )
    ).toEqual([true, true]);
    expect(
      run('function tag(s) { return s; } function f() { return tag`x`; } return f() === f();')
    ).toBe(true);
    expect(run('function tag(s) { return s; } return tag`x` === tag`x`;')).toBe(false);
  });

  it('binds this as a call of the same form does', () => {
    expect(run('const obj = { tag() { return this === obj; } }; return obj.tag`x`;')).toBe(true);
    expect(run('const obj = { tag() { return this === obj; } }; return obj["tag"]`x`;')).toBe(true);
    expect(run('const obj = { tag() { return this === obj; } }; return (obj?.tag)`x`;')).toBe(true);
    expect(run('function tag() { return this; } return tag`x`;')).toBeUndefined();
    expect(run('const obj = { tag() { return this; } }; return (0, obj.tag)`x`;')).toBeUndefined();
  });

  it('evaluates the tag before the substitutions', () => {
    expect(
      run(
        'const log = []; function tag() {} (log.push("tag"), tag)`${log.push("sub")}`; return log;'
      )
    ).toEqual(['tag', 'sub']);
    expect(
      run(
        'const log = []; function fail() { throw new Error("x"); } try { fail()`${log.push("sub")}`; } catch (e) {} return log;'
      )
    ).toEqual([]);
  });

  it('throws a TypeError for a tag that is not a function', () => {
    expect(errorMessage(maple, 'const tag = 1; tag`x`;')).toBe('tag is not a function');
    expect(errorMessage(maple, 'const obj = {}; obj.missing`x`;')).toBe(
      'obj.missing is not a function'
    );
    expect(errorMessage(maple, 'function t() {} (t`x`)();')).toBe('t(...) is not a function');
    expect(errorMessage(maple, 'const obj = {}; (obj?.tag)`x`;')).toBe('value is not a function');
  });

  it('runs the tag as a script call', () => {
    expect(
      run(
        'function tag() { throw new TypeError("boom"); } try { tag`x`; } catch (e) { return [e.name, e.message, e.stack]; }'
      )
    ).toEqual(['TypeError', 'boom', 'TypeError: boom\n    at tag (1:23)\n    at <script> (1:54)']);
    expect(run('function tag(s) { return s[0].toUpperCase(); } return tag`a`.length;')).toBe(1);
    expect(run('function tag(s) { return (t) => t[0] + s[0]; } return tag`a``b`;')).toBe('ba');
    expect(run('function tag(s, ...v) { return v; } return tag`${tag`x`}`;')).toEqual([[]]);
  });

  it('gives a host function the strings as a copy without raw', () => {
    const received: Array<unknown> = [];
    const tag = (strings: Array<string>, ...values: Array<unknown>): string => {
      received.push(strings, Object.hasOwn(strings, 'raw'), Object.isFrozen(strings));
      return `${strings.join('|')}${values.join(',')}`;
    };
    expect(run('return tag`a${1}b`;', { tag })).toBe('a|b1');
    expect(received).toEqual([['a', 'b'], false, false]);
  });

  it('refuses an optional chain in the tag, as JavaScript does', () => {
    expect(runAndCatch(maple, 'const a = {}; a?.b`x`;').code).toBe('PARSE_ERROR');
  });

  it('counts the tag call and the strings as operations', () => {
    const limited = new Maple({ maxOps: 3 });
    expect(runAndCatch(limited, 'function tag() {} tag`a${1}b`;').code).toBe('LIMIT_EXCEEDED');
  });
});
