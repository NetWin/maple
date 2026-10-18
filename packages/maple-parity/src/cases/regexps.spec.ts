import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('RegExp.prototype.test', () => {
  it('tells whether a string matches', () => {
    expect(
      parity("var r = /^a.c$/; return [r.test('abc'), r.test('abbc'), /\\d/.test('x1')];")
    ).toEqual([true, false, true]);
  });

  it('ignoreCase matching', () => {
    expect(parity("return [/abc/i.test('ABC'), /abc/.test('ABC')];")).toEqual([true, false]);
  });

  it('matches a backreference', () => {
    expect(parity("return [/(\\w)\\1/.test('hello'), /(\\w)\\1/.test('helo')];")).toEqual([
      true,
      false
    ]);
  });

  it('escaped special characters', () => {
    expect(
      parity(
        "return [/\\./.test('a.b'), /\\./.test('ab'), /\\$\\d/.exec('cost $5')[0], /[.]/.source];"
      )
    ).toEqual([true, false, '$5', '[.]']);
  });
});

describe('RegExp.prototype.exec', () => {
  it('with groups and index', () => {
    expect(
      parity(
        "var m = /(\\w+)@(\\w+)\\.com/.exec('mail: ann@site.com!'); return [m[0], m[1], m[2], m.index, m.input, m.length];"
      )
    ).toEqual(['ann@site.com', 'ann', 'site', 6, 'mail: ann@site.com!', 3]);
  });

  it('without a match', () => {
    expect(parity("return /z/.exec('abc');")).toEqual(null);
  });

  it('with an unmatched optional group', () => {
    expect(
      parity("var m = /a(b)?c/.exec('ac'); return [m[0], m[1] === undefined, m.length];")
    ).toEqual(['ac', true, 2]);
  });

  it('loop over all matches', () => {
    expect(
      parity(
        "var r = /(\\d+)/g; var s = 'a1 b22 c333'; var found = []; var m; while ((m = r.exec(s)) !== null) { found.push(m[1] + '@' + m.index); } return found;"
      )
    ).toEqual(['1@1', '22@4', '333@8']);
  });

  it('alternation and non-capturing groups', () => {
    expect(
      parity("var m = /(?:cat|dog)s?-(\\d)/.exec('dogs-7'); return [m[0], m[1], m.length];")
    ).toEqual(['dogs-7', '7', 2]);
  });
});

describe('instance:regexp.lastIndex', () => {
  it('global exec advances lastIndex', () => {
    expect(
      parity(
        "var r = /\\d/g; var s = 'a1b2'; var out = []; out.push(r.lastIndex); r.exec(s); out.push(r.lastIndex); r.exec(s); out.push(r.lastIndex); out.push(r.exec(s)); out.push(r.lastIndex); return out;"
      )
    ).toEqual([0, 2, 4, null, 0]);
  });

  it('global test advances lastIndex', () => {
    expect(
      parity(
        "var r = /a/g; return [r.test('aa'), r.lastIndex, r.test('aa'), r.lastIndex, r.test('aa'), r.lastIndex];"
      )
    ).toEqual([true, 1, true, 2, false, 0]);
  });

  it('can be assigned', () => {
    expect(
      parity(
        "var r = /o/g; r.lastIndex = 5; var m = r.exec('foo boo'); return [m.index, r.lastIndex];"
      )
    ).toEqual([5, 6]);
  });

  it('literal creates a new object each evaluation', () => {
    expect(
      parity(
        'function make() { return /x/g; } var a = make(); a.lastIndex = 1; return make().lastIndex;'
      )
    ).toEqual(0);
  });
});

describe('RegExp.prototype.global', () => {
  it('flag properties', () => {
    expect(
      parity(
        'var r = /a/gim; var p = /b/; return [r.global, r.ignoreCase, r.multiline, p.global, p.ignoreCase, p.multiline];'
      )
    ).toEqual([true, true, true, false, false, false]);
  });
});

describe('RegExp.prototype.source', () => {
  it('is the pattern text', () => {
    expect(parity("return [/a\\/b[c]+/.source, new RegExp('x.y').source];")).toEqual([
      'a\\/b[c]+',
      'x.y'
    ]);
  });
});

describe('RegExp', () => {
  it('constructor with flags', () => {
    expect(
      parity(
        "var r = new RegExp('^h(.)', 'gi'); return [r.test('Hi'), r.global, r.ignoreCase, r.source];"
      )
    ).toEqual([true, true, true, '^h(.)']);
  });

  it('constructor called without new', () => {
    expect(parity("var r = RegExp('b+'); return r.exec('abbbc')[0];")).toEqual('bbb');
  });

  it('constructor with an invalid pattern throws', () => {
    expect(allThrow("return new RegExp('(').source;")).toBe('SyntaxError');
  });

  it('pattern from host data', () => {
    expect(
      parity("return new RegExp(pattern, 'g').test(text);", { pattern: '^[a-z]+$', text: 'maple' })
    ).toEqual(true);
  });
});

describe('String.prototype.match', () => {
  it('multiline anchors', () => {
    expect(
      parity(
        "var s = 'one\\ntwo'; return [/^two$/m.test(s), /^two$/.test(s), s.match(/^\\w+$/gm)];"
      )
    ).toEqual([true, false, ['one', 'two']]);
  });

  it('matches with lookaheads', () => {
    expect(
      parity("return ['price: 100 USD'.match(/\\d+(?= USD)/)[0], /a(?!b)/.test('ab')];")
    ).toEqual(['100', false]);
  });

  it('with g starts from the beginning', () => {
    expect(parity("var r = /a/g; r.lastIndex = 3; return 'aaa'.match(r);")).toEqual([
      'a',
      'a',
      'a'
    ]);
  });
});

describe('String.prototype.split', () => {
  it('character classes and quantifiers', () => {
    expect(
      parity(
        "return ['a1_ b-2'.match(/[\\w]+/g), 'aaa'.match(/a{2}/)[0], 'abbb'.match(/ab*?/)[0], 'x y\\tz'.split(/\\s/)];"
      )
    ).toEqual([['a1_', 'b', '2'], 'aa', 'a', ['x', 'y', 'z']]);
  });

  it('with a limit', () => {
    expect(parity("return 'a1b2c3'.split(/\\d/, 2);")).toEqual(['a', 'b']);
  });
});

describe('String.prototype.replace', () => {
  it('with a global regex and groups', () => {
    expect(parity("return 'a=1, b=2'.replace(/(\\w)=(\\d)/g, '$2:$1');")).toEqual('1:a, 2:b');
  });

  it('with a function', () => {
    expect(
      parity("return 'hello world'.replace(/\\b\\w/g, function (c) { return c.toUpperCase(); });")
    ).toEqual('Hello World');
  });
});

describe('String.prototype.search', () => {
  it('returns the index', () => {
    expect(parity("return ['find 42 here'.search(/\\d+/), 'none'.search(/\\d+/)];")).toEqual([
      5, -1
    ]);
  });
});

describe('String', () => {
  it('string conversion', () => {
    expect(parity("return [String(/a\\/b/gi), '' + new RegExp('x', 'm')];")).toEqual([
      '/a\\/b/gi',
      '/x/m'
    ]);
  });
});

describe('RegExp.prototype.ignoreCase', () => {
  it('reflects the i flag', () => {
    expect(
      parity("return [/a/i.ignoreCase, /a/.ignoreCase, new RegExp('a', 'i').ignoreCase];")
    ).toEqual([true, false, true]);
  });
});

describe('RegExp.prototype.multiline', () => {
  it('reflects the m flag', () => {
    expect(
      parity("return [/a/m.multiline, /a/.multiline, new RegExp('a', 'm').multiline];")
    ).toEqual([true, false, true]);
  });
});

describe('instance:regexp.global', () => {
  it('is a property of each regexp', () => {
    expect(parity("var a = /x/g; var b = new RegExp('x'); return [a.global, b.global];")).toEqual([
      true,
      false
    ]);
  });
});

describe('instance:regexp.ignoreCase', () => {
  it('is a property of each regexp', () => {
    expect(parity("return [/x/gi.ignoreCase, new RegExp('x', 'g').ignoreCase];")).toEqual([
      true,
      false
    ]);
  });
});

describe('instance:regexp.multiline', () => {
  it('is a property of each regexp', () => {
    expect(parity("return [/x/m.multiline, new RegExp('x').multiline];")).toEqual([true, false]);
  });
});

describe('instance:regexp.source', () => {
  it('is the pattern text', () => {
    expect(
      parity("return [/a\\/b[c]+/.source, new RegExp('x.y').source, new RegExp('/').source];")
    ).toEqual(['a\\/b[c]+', 'x.y', '\\/']);
  });
});

describe('assign:RegExp property', () => {
  it('adds a property to a RegExp', () => {
    expect(
      parity('var r = /a/; r.meta = 1; return [r.meta, Object.keys(r), r.test("a")];')
    ).toEqual([1, ['meta'], true]);
  });
});
