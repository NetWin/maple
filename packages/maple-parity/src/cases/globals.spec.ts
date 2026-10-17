import { describe, expect, it } from 'vitest';
import { bothThrow, parity } from '../parity.ts';

describe('NaN', () => {
  it('NaN is not equal to itself', () => {
    expect(parity('return [NaN === NaN, NaN !== NaN, typeof NaN];')).toEqual([
      false,
      true,
      'number'
    ]);
  });
});

describe('Infinity', () => {
  it('Infinity arithmetic', () => {
    expect(parity('return [Infinity + 1, -Infinity, 1 / 0, -1 / 0, Infinity - Infinity];')).toEqual(
      [Infinity, -Infinity, Infinity, -Infinity, NaN]
    );
  });
});

describe('undefined', () => {
  it('undefined global', () => {
    expect(
      parity('var x; return [x === undefined, typeof undefined, void 0 === undefined];')
    ).toEqual([true, 'undefined', true]);
  });
});

describe('parseInt', () => {
  it('parseInt of decimal strings', () => {
    expect(
      parity("return [parseInt('42'), parseInt('-17'), parseInt('3.9'), parseInt('+8')];")
    ).toEqual([42, -17, 3, 8]);
  });
  it('parseInt skips leading whitespace and stops at junk', () => {
    expect(
      parity("return [parseInt('  12px'), parseInt('\\n\\t7'), parseInt('12abc34')];")
    ).toEqual([12, 7, 12]);
  });
  it('parseInt with a radix', () => {
    expect(
      parity(
        "return [parseInt('ff', 16), parseInt('101', 2), parseInt('z', 36), parseInt('777', 8), parseInt('10', 10)];"
      )
    ).toEqual([255, 5, 35, 511, 10]);
  });
  it('parseInt of hex prefixes', () => {
    expect(parity("return [parseInt('0x1F'), parseInt('0X10'), parseInt('0x1F', 16)];")).toEqual([
      31, 16, 31
    ]);
  });
  it('parseInt without digits is NaN', () => {
    expect(
      parity("return [parseInt(''), parseInt('abc'), parseInt('-'), parseInt('2', 2)];")
    ).toEqual([NaN, NaN, NaN, NaN]);
  });
  it('parseInt converts its argument to a string', () => {
    expect(parity('return [parseInt(15.99), parseInt(null), parseInt(true)];')).toEqual([
      15,
      NaN,
      NaN
    ]);
  });
  it('typeof the built-in functions', () => {
    expect(
      parity('return [typeof parseInt, typeof isNaN, typeof encodeURI, typeof Math, typeof JSON];')
    ).toEqual(['function', 'function', 'function', 'object', 'object']);
  });
});

describe('parseFloat', () => {
  it('parses a leading decimal number', () => {
    expect(
      parity(
        "return [parseFloat('3.14'), parseFloat('  -0.5e2xyz'), parseFloat('.5'), parseFloat('1e3'), parseFloat('Infinity'), parseFloat('abc')];"
      )
    ).toEqual([3.14, -50, 0.5, 1000, Infinity, NaN]);
  });
  it('parseFloat stops at the second dot', () => {
    expect(parity("return parseFloat('1.2.3');")).toEqual(1.2);
  });
});

describe('isNaN', () => {
  it('isNaN coerces its argument', () => {
    expect(
      parity(
        "return [isNaN(NaN), isNaN('abc'), isNaN('12'), isNaN(undefined), isNaN(null), isNaN(''), isNaN({})];"
      )
    ).toEqual([true, true, false, true, false, false, true]);
  });
});

describe('isFinite', () => {
  it('isFinite coerces its argument', () => {
    expect(
      parity(
        "return [isFinite(1), isFinite('12'), isFinite(Infinity), isFinite(NaN), isFinite(null), isFinite('x')];"
      )
    ).toEqual([true, true, false, false, true, false]);
  });
});

describe('encodeURIComponent', () => {
  it('escapes everything but unreserved characters', () => {
    expect(parity("return encodeURIComponent('a b&c=d/e?f#ü€');")).toEqual(
      'a%20b%26c%3Dd%2Fe%3Ff%23%C3%BC%E2%82%AC'
    );
  });
  it('encode and decode round trip', () => {
    expect(
      parity("var s = 'Grüße & co / 100%'; return decodeURIComponent(encodeURIComponent(s)) === s;")
    ).toEqual(true);
  });
  it('encodeURIComponent of a lone surrogate throws', () => {
    expect(bothThrow("return encodeURIComponent('\\uD800');")).toBe('URIError');
  });
});

describe('encodeURI', () => {
  it('encodeURI keeps URI delimiters', () => {
    expect(parity("return encodeURI('http://x.y/a b?q=1&r=ü#h');")).toEqual(
      'http://x.y/a%20b?q=1&r=%C3%BC#h'
    );
  });
});

describe('decodeURIComponent', () => {
  it('decodes escapes, multi-byte ones included', () => {
    expect(parity("return decodeURIComponent('a%20b%26c%3Dd%C3%BC%E2%82%AC');")).toEqual(
      'a b&c=dü€'
    );
  });
  it('decodeURIComponent of a malformed escape throws', () => {
    expect(bothThrow("return decodeURIComponent('%');")).toBe('URIError');
  });
});

describe('decodeURI', () => {
  it('decodeURI keeps reserved escapes', () => {
    expect(parity("return decodeURI('a%20b%2Fc%3F%C3%BC');")).toEqual('a b%2Fc%3Fü');
  });
  it('decodeURI of a malformed escape throws', () => {
    expect(bothThrow("return decodeURI('%E0%A4%A');")).toBe('URIError');
  });
});

describe('escape', () => {
  it('encodes with %XX below 256 and %uXXXX above', () => {
    expect(
      parity("return [escape('a b'), escape('@*_+-./'), escape('ä€'), escape('~!')];")
    ).toEqual(['a%20b', '@*_+-./', '%E4%u20AC', '%7E%21']);
  });
});

describe('unescape', () => {
  it('decodes both forms and keeps what is no escape', () => {
    expect(
      parity("return [unescape('a%20b'), unescape('%u20AC%e4'), unescape('%zz%u12%')];")
    ).toEqual(['a b', '€ä', '%zz%u12%']);
  });
});

describe('Number', () => {
  it('Number as a conversion function', () => {
    expect(
      parity(
        "return [Number('42'), Number(''), Number('  7  '), Number('0x10'), Number('1e3'), Number('abc'), Number(true), Number(null), Number(undefined), Number([]), Number([5])];"
      )
    ).toEqual([42, 0, 7, 16, 1000, NaN, 1, 0, NaN, 0, 5]);
  });
  it('Number with no argument', () => {
    expect(parity('return Number();')).toEqual(0);
  });
});

describe('String', () => {
  it('String as a conversion function', () => {
    expect(
      parity(
        'return [String(1), String(-0), String(null), String(undefined), String(true), String([1, [2, 3]]), String(1e21), String(0.000001), String(1e-7)];'
      )
    ).toEqual(['1', '0', 'null', 'undefined', 'true', '1,2,3', '1e+21', '0.000001', '1e-7']);
  });
  it('String with no argument', () => {
    expect(parity('return String();')).toEqual('');
  });
});

describe('Number.MAX_VALUE', () => {
  it('is the largest finite number', () => {
    expect(parity('return [Number.MAX_VALUE, Number.MAX_VALUE * 2 === Infinity];')).toEqual([
      1.7976931348623157e308,
      true
    ]);
  });
});

describe('Number.MIN_VALUE', () => {
  it('is the smallest positive number', () => {
    expect(
      parity('return [Number.MIN_VALUE, Number.MIN_VALUE / 2, Number.MIN_VALUE > 0];')
    ).toEqual([5e-324, 0, true]);
  });
});

describe('Number.POSITIVE_INFINITY', () => {
  it('is Infinity', () => {
    expect(
      parity('return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY === Infinity];')
    ).toEqual([Infinity, true]);
  });
});

describe('Number.NEGATIVE_INFINITY', () => {
  it('is minus Infinity', () => {
    expect(
      parity('return [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY === -Infinity];')
    ).toEqual([-Infinity, true]);
  });
});

describe('Number.NaN', () => {
  it('is NaN', () => {
    expect(parity('var n = Number.NaN; return [n !== n, typeof n];')).toEqual([true, 'number']);
  });
});

describe('String.fromCharCode', () => {
  it('builds a string from char codes', () => {
    expect(
      parity(
        'return [String.fromCharCode(72, 105), String.fromCharCode(), String.fromCharCode(0x20AC), String.fromCharCode(65.7)];'
      )
    ).toEqual(['Hi', '', '€', 'A']);
  });
});

describe('Array', () => {
  it('Array.isArray', () => {
    expect(
      parity(
        "return [Array.isArray([]), Array.isArray({}), Array.isArray('a'), Array.isArray({ length: 0 })];"
      )
    ).toEqual([true, false, false, false]);
  });
});

describe('Array.isArray', () => {
  it('Array.isArray on data', () => {
    expect(
      parity('return [Array.isArray(list), Array.isArray(item)];', { list: [1, 2], item: { a: 1 } })
    ).toEqual([true, false]);
  });
});

describe('globals from data', () => {
  it('reading an undeclared global throws', () => {
    expect(bothThrow('return notDeclaredAnywhere;')).toBe('ReferenceError');
  });
  it('typeof an undeclared global', () => {
    expect(parity('return typeof notDeclaredAnywhere;')).toEqual('undefined');
  });
  it('data values as globals', () => {
    expect(
      parity("return [count + 1, label + '!', flag ? 'yes' : 'no', items.length];", {
        count: 41,
        label: 'hi',
        flag: true,
        items: [1, 2, 3]
      })
    ).toEqual([42, 'hi!', 'yes', 3]);
  });
});
