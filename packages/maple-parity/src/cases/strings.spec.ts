import { describe, expect, it } from 'vitest';
import { parity } from '../parity.ts';

describe('String.prototype.charAt', () => {
  it('in and out of range', () => {
    expect(
      parity("var s = 'abc'; return [s.charAt(0), s.charAt(2), s.charAt(5), s.charAt()];")
    ).toEqual(['a', 'c', '', 'a']);
  });
});

describe('String.prototype.charCodeAt', () => {
  it('in and out of range', () => {
    expect(
      parity("var s = 'aZ'; return [s.charCodeAt(0), s.charCodeAt(1), isNaN(s.charCodeAt(9))];")
    ).toEqual([97, 90, true]);
  });
});

describe('String.fromCharCode', () => {
  it('builds a string from char codes', () => {
    expect(parity('return [String.fromCharCode(72, 105), String.fromCharCode()];')).toEqual([
      'Hi',
      ''
    ]);
  });
});

describe('String.prototype.concat', () => {
  it('with several arguments', () => {
    expect(parity("return 'a'.concat('b', 1, null);")).toEqual('ab1null');
  });
});

describe('String.prototype.indexOf', () => {
  it('with a start position', () => {
    expect(
      parity(
        "var s = 'banana'; return [s.indexOf('an'), s.indexOf('an', 2), s.indexOf('x'), s.indexOf('')];"
      )
    ).toEqual([1, 3, -1, 0]);
  });
});

describe('String.prototype.lastIndexOf', () => {
  it('with a start position', () => {
    expect(
      parity(
        "var s = 'banana'; return [s.lastIndexOf('an'), s.lastIndexOf('an', 2), s.lastIndexOf('x')];"
      )
    ).toEqual([3, 1, -1]);
  });
});

describe('String.prototype.slice', () => {
  it('with negative bounds', () => {
    expect(
      parity(
        "var s = 'abcdef'; return [s.slice(2), s.slice(1, 3), s.slice(-2), s.slice(-4, -1), s.slice(4, 1)];"
      )
    ).toEqual(['cdef', 'bc', 'ef', 'cde', '']);
  });
});

describe('String.prototype.substr', () => {
  it('with a negative start', () => {
    expect(
      parity(
        "var s = 'abcdef'; return [s.substr(1, 3), s.substr(-3), s.substr(-3, 2), s.substr(2)];"
      )
    ).toEqual(['bcd', 'def', 'de', 'cdef']);
  });
});

describe('String.prototype.substring', () => {
  it('swaps and clamps its arguments', () => {
    expect(
      parity(
        "var s = 'abcdef'; return [s.substring(1, 3), s.substring(3, 1), s.substring(-2, 2), s.substring(4)];"
      )
    ).toEqual(['bc', 'bc', 'ab', 'ef']);
  });
});

describe('String.prototype.toLowerCase', () => {
  it('case conversion', () => {
    expect(parity("var s = 'Hello World'; return [s.toLowerCase(), s.toUpperCase()];")).toEqual([
      'hello world',
      'HELLO WORLD'
    ]);
  });
});

describe('String.prototype.toLocaleLowerCase', () => {
  it('locale case conversion', () => {
    expect(
      parity("var s = 'Straße'; return [s.toLocaleLowerCase(), s.toLocaleUpperCase()];")
    ).toEqual(['straße', 'STRASSE']);
  });
});

describe('String.prototype.trim', () => {
  it('removes surrounding whitespace', () => {
    expect(parity("return ['  a b \\t\\n'.trim(), ''.trim()];")).toEqual(['a b', '']);
  });

  it('then case conversion chain', () => {
    expect(parity("return '  Mixed Case  '.trim().toLowerCase().replace(' ', '_');")).toEqual(
      'mixed_case'
    );
  });
});

describe('String.prototype.localeCompare', () => {
  it('orders strings', () => {
    expect(
      parity(
        "function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; } return [sign('a'.localeCompare('b')), sign('b'.localeCompare('a')), sign('a'.localeCompare('a'))];"
      )
    ).toEqual([-1, 1, 0]);
  });
});

describe('String.prototype.split', () => {
  it('by a string', () => {
    expect(
      parity("return ['a,b,,c'.split(','), 'abc'.split(''), 'abc'.split(), ''.split(',')];")
    ).toEqual([['a', 'b', '', 'c'], ['a', 'b', 'c'], ['abc'], ['']]);
  });

  it('with a limit', () => {
    expect(parity("return 'a-b-c-d'.split('-', 2);")).toEqual(['a', 'b']);
  });

  it('by a regex', () => {
    expect(parity("return ['a1b22c'.split(/\\d+/), 'a, b ,c'.split(/\\s*,\\s*/)];")).toEqual([
      ['a', 'b', 'c'],
      ['a', 'b', 'c']
    ]);
  });

  it('by a regex with a capture group', () => {
    expect(parity("return 'a1b2c'.split(/(\\d)/);")).toEqual(['a', '1', 'b', '2', 'c']);
  });
});

describe('String.prototype.match', () => {
  it('without the g flag', () => {
    expect(
      parity("var m = 'x12y34'.match(/(\\d)(\\d)/); return [m[0], m[1], m[2], m.index, m.length];")
    ).toEqual(['12', '1', '2', 1, 3]);
  });

  it('with the g flag', () => {
    expect(parity("return ['x12y34'.match(/\\d/g), 'abc'.match(/\\d/g)];")).toEqual([
      ['1', '2', '3', '4'],
      null
    ]);
  });

  it('without a hit', () => {
    expect(parity("return 'abc'.match(/z/);")).toEqual(null);
  });
});

describe('String.prototype.search', () => {
  it('returns the index of the first match', () => {
    expect(
      parity("return ['abc1'.search(/\\d/), 'abc'.search(/\\d/), 'aBc'.search(/b/i)];")
    ).toEqual([3, -1, 1]);
  });
});

describe('String.prototype.replace', () => {
  it('with a string replaces the first only', () => {
    expect(parity("return 'a-b-c'.replace('-', '+');")).toEqual('a+b-c');
  });

  it('with a global regex', () => {
    expect(parity("return 'a-b-c'.replace(/-/g, '+');")).toEqual('a+b+c');
  });

  it('with group references', () => {
    expect(
      parity(
        "return ['John Smith'.replace(/(\\w+)\\s(\\w+)/, '$2, $1'), 'abc'.replace('b', '[$&]'), 'abc'.replace('b', '$$')];"
      )
    ).toEqual(['Smith, John', 'a[b]c', 'a$c']);
  });

  it('with a replacer function', () => {
    expect(
      parity(
        "return 'a1b22'.replace(/\\d+/g, function (match, offset) { return '<' + match.length + '@' + offset + '>'; });"
      )
    ).toEqual('a<1@1>b<2@3>');
  });

  it('with a replacer receiving groups', () => {
    expect(
      parity(
        "return '2024-05'.replace(/(\\d+)-(\\d+)/, function (all, year, month) { return month + '/' + year; });"
      )
    ).toEqual('05/2024');
  });
});

describe('String', () => {
  it('indexing and length', () => {
    expect(parity("var s = 'abc'; return [s[1], s[5], s.length, ''.length];")).toEqual([
      'b',
      undefined,
      3,
      0
    ]);
  });

  it('escape sequences', () => {
    expect(parity("var s = 'a\\tb\\nc\\\\d\\'e\\u0041\\x42'; return [s, s.length];")).toEqual([
      "a\tb\nc\\d'eAB",
      11
    ]);
  });

  it('comparison is by code unit', () => {
    expect(
      parity("return ['a' < 'b', 'B' < 'a', 'abc' < 'abd', '10' < '9', 'a' === 'a'];")
    ).toEqual([true, true, true, true, true]);
  });

  it('conversion of values', () => {
    expect(
      parity(
        'return [String(1), String(true), String(null), String(undefined), String(-0), String([1, 2])];'
      )
    ).toEqual(['1', 'true', 'null', 'undefined', '0', '1,2']);
  });

  it('concatenation with plus', () => {
    expect(parity("return ['a' + 1 + 2, 1 + 2 + 'a', 'x' + null, 'x' + undefined];")).toEqual([
      'a12',
      '3a',
      'xnull',
      'xundefined'
    ]);
  });

  it('methods on numbers converted with String', () => {
    expect(parity('return String(12345).slice(-3);')).toEqual('345');
  });
});

describe('String.prototype.toUpperCase', () => {
  it('methods on host data', () => {
    expect(
      parity("return name.toUpperCase().split('').reverse().join('');", { name: 'maple' })
    ).toEqual('ELPAM');
  });
});

describe('String.prototype.toLocaleUpperCase', () => {
  it('converts to upper case', () => {
    expect(parity("return ['straße'.toLocaleUpperCase(), 'abc'.toLocaleUpperCase()];")).toEqual([
      'STRASSE',
      'ABC'
    ]);
  });
});
