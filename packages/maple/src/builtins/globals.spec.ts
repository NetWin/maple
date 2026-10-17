import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('URI functions', () => {
  it('encode and decode URIs', () => {
    expect(run('return encodeURIComponent("a b&c");')).toBe('a%20b%26c');
    expect(run('return decodeURIComponent("a%20b");')).toBe('a b');
    expect(run('return encodeURI("http://x/a b");')).toBe('http://x/a%20b');
    expect(run('return decodeURI("http://x/a%20b");')).toBe('http://x/a b');
    expect(
      run('try { decodeURIComponent("%"); } catch (e) { return [e.name, e instanceof Error]; }')
    ).toEqual(['URIError', true]);
  });
});

describe('escape and unescape', () => {
  it('encode per UTF-16 code unit as the language does', () => {
    expect(
      run('return [escape("a b"), escape("@*_+-./"), escape("\\u00ff\\u0100"), escape("😀")];')
    ).toEqual(['a%20b', '@*_+-./', '%FF%u0100', '%uD83D%uDE00']);
  });

  it('decode both forms and keep anything else', () => {
    expect(
      run('return [unescape("%uD83D%uDE00"), unescape("%41%u0042"), unescape("%4%zz%")];')
    ).toEqual(['😀', 'AB', '%4%zz%']);
    expect(run('return unescape(escape("ä€😀 %"));')).toBe('ä€😀 %');
  });

  it('convert their argument hook-free', () => {
    expect(run('return [escape(1.5), escape(), unescape(null)];')).toEqual([
      '1.5',
      'undefined',
      'null'
    ]);
  });
});

describe('base64', () => {
  it('encodes and decodes Latin-1 text', () => {
    expect(run('return btoa("Maple");')).toBe('TWFwbGU=');
    expect(run('return atob("TWFwbGU=");')).toBe('Maple');
    expect(run('return atob(btoa("ä"));')).toBe('ä');
  });

  it('reports characters outside the alphabet as catchable errors', () => {
    expect(run('try { atob("*"); } catch (e) { return [e.name, e instanceof Error]; }')).toEqual([
      'InvalidCharacterError',
      true
    ]);
    expect(run('try { btoa("😀"); } catch (e) { return e.name; }')).toBe('InvalidCharacterError');
  });
});
