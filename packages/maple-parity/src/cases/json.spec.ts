import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('JSON', () => {
  it('JSON.stringify of primitives', () => {
    expect(
      parity(
        "return [JSON.stringify(1), JSON.stringify('a'), JSON.stringify(true), JSON.stringify(null), JSON.stringify(-0)];"
      )
    ).toEqual(['1', '"a"', 'true', 'null', '0']);
  });
});

describe('undefined', () => {
  it('JSON.stringify of undefined is undefined', () => {
    expect(parity('return JSON.stringify(undefined) === undefined;')).toEqual(true);
  });
});

describe('JSON.stringify', () => {
  it('JSON.stringify of nested values', () => {
    expect(parity("return JSON.stringify({ a: [1, { b: 'c' }], d: { e: null }, f: [] });")).toEqual(
      '{"a":[1,{"b":"c"}],"d":{"e":null},"f":[]}'
    );
  });
  it('JSON.stringify escapes strings', () => {
    expect(
      parity(
        "return JSON.stringify('quote \" backslash \\\\ newline \\n tab \\t control \\u0001 unicode ü');"
      )
    ).toEqual('"quote \\" backslash \\\\ newline \\n tab \\t control \\u0001 unicode ü"');
  });
  it('JSON.stringify turns non-finite numbers into null', () => {
    expect(parity('return JSON.stringify([NaN, Infinity, -Infinity, 1.5]);')).toEqual(
      '[null,null,null,1.5]'
    );
  });
  it('JSON.stringify drops undefined members', () => {
    expect(parity('return JSON.stringify({ a: undefined, c: 1 });')).toEqual('{"c":1}');
  });
  it('JSON.stringify writes null for undefined array elements', () => {
    expect(parity('return JSON.stringify([undefined, 2]);')).toEqual('[null,2]');
  });
  it('JSON.stringify keeps integer keys first', () => {
    expect(parity('return JSON.stringify({ b: 1, 2: 2, a: 3, 1: 4 });')).toEqual(
      '{"1":4,"2":2,"b":1,"a":3}'
    );
  });
  it('JSON.stringify with a replacer array', () => {
    expect(parity("return JSON.stringify({ a: 1, b: 2, c: { a: 3, d: 4 } }, ['a', 'c']);")).toEqual(
      '{"a":1,"c":{"a":3}}'
    );
  });
  it('JSON.stringify with a numeric indent', () => {
    expect(parity('return JSON.stringify({ a: [1, 2], b: {} }, null, 2);')).toEqual(
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {}\n}'
    );
  });
  it('JSON.stringify with a string indent', () => {
    expect(parity("return JSON.stringify({ a: 1, b: [true] }, null, '--');")).toEqual(
      '{\n--"a": 1,\n--"b": [\n----true\n--]\n}'
    );
  });
  it('JSON.stringify clamps the indent to ten', () => {
    expect(parity('return JSON.stringify({ a: 1 }, null, 20);')).toEqual('{\n          "a": 1\n}');
  });
  it('JSON.stringify of data', () => {
    expect(
      parity('return JSON.stringify(payload);', {
        payload: { id: 7, tags: ['a', 'b'], nested: { ok: true } }
      })
    ).toEqual('{"id":7,"tags":["a","b"],"nested":{"ok":true}}');
  });
});

describe('Date.prototype.toJSON', () => {
  it('JSON.stringify of a date uses toJSON', () => {
    expect(
      parity(
        'var d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5)); return [JSON.stringify(d), JSON.stringify({ when: d }), d.toJSON()];'
      )
    ).toEqual([
      '"2020-01-02T03:04:05.000Z"',
      '{"when":"2020-01-02T03:04:05.000Z"}',
      '2020-01-02T03:04:05.000Z'
    ]);
  });
});

describe('JSON.parse', () => {
  it('JSON.parse of primitives', () => {
    expect(
      parity(
        "return [JSON.parse('1'), JSON.parse('\"s\"'), JSON.parse('true'), JSON.parse('null'), JSON.parse('-1.5e2')];"
      )
    ).toEqual([1, 's', true, null, -150]);
  });
  it('JSON.parse of nested values', () => {
    expect(parity('return JSON.parse(\'{"a":[1,{"b":"c"}],"d":{"e":null}}\');')).toEqual({
      a: [1, { b: 'c' }],
      d: { e: null }
    });
  });
  it('JSON.parse allows surrounding whitespace', () => {
    expect(parity('return JSON.parse(\' \\n\\t { "a" : [ 1 , 2 ] } \\r\\n \');')).toEqual({
      a: [1, 2]
    });
  });
  it('JSON.parse decodes escapes', () => {
    expect(parity('return JSON.parse(\'"a\\\\nb\\\\u00fc\\\\""\');')).toEqual('a\nbü"');
  });
  it('JSON.parse of invalid text throws', () => {
    expect(allThrow("return JSON.parse('{a:1}');")).toBe('SyntaxError');
  });
  it('JSON.parse of a trailing comma throws', () => {
    expect(allThrow("return JSON.parse('[1,2,]');")).toBe('SyntaxError');
  });
  it('JSON.parse of an empty string throws', () => {
    expect(allThrow("return JSON.parse('');")).toBe('SyntaxError');
  });
  it('JSON round trip', () => {
    expect(
      parity(
        "var o = { s: 'x', n: 1.25, b: false, a: [null, { z: [] }] }; return JSON.parse(JSON.stringify(o));"
      )
    ).toEqual({ s: 'x', n: 1.25, b: false, a: [null, { z: [] }] });
  });
});
