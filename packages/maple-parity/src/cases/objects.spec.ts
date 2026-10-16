import { describe, expect, it } from 'vitest';
import { parity } from '../parity.ts';

describe('object values', () => {
  it('object literal with mixed values', () => {
    expect(parity("return { a: 1, b: 'two', c: true, d: null, e: [1, 2], f: { g: 3 } };")).toEqual({
      a: 1,
      b: 'two',
      c: true,
      d: null,
      e: [1, 2],
      f: { g: 3 }
    });
  });
  it('object literal with quoted and numeric keys', () => {
    expect(
      parity("var o = { 'a b': 1, 2: 'two', 'c': 3 }; return [o['a b'], o[2], o['2'], o.c];")
    ).toEqual([1, 'two', 'two', 3]);
  });
  it('nested object property reads', () => {
    expect(parity('var o = { a: { b: { c: 42 } } }; return o.a.b.c + o["a"]["b"]["c"];')).toEqual(
      84
    );
  });
  it('adding and updating properties', () => {
    expect(parity('var o = {}; o.a = 1; o["b"] = 2; o.a = o.a + 10; return o;')).toEqual({
      a: 11,
      b: 2
    });
  });
  it('deleting a property', () => {
    expect(parity('var o = { a: 1, b: 2 }; var r = delete o.a; return [r, o, "a" in o];')).toEqual([
      true,
      { b: 2 },
      false
    ]);
  });
  it('deleting a missing property returns true', () => {
    expect(parity('var o = { a: 1 }; return [delete o.missing, o];')).toEqual([true, { a: 1 }]);
  });
  it('the in operator on objects', () => {
    expect(
      parity(
        "var o = { a: undefined }; return ['a' in o, 'b' in o, 'toString' in { toString: 1 }];"
      )
    ).toEqual([true, false, true]);
  });
  it('the in operator on arrays', () => {
    expect(parity('var a = [5, 6]; return [0 in a, 1 in a, 2 in a];')).toEqual([true, true, false]);
  });
  it('for-in visits keys in insertion order', () => {
    expect(
      parity(
        'var o = { b: 1, a: 2, c: 3 }; var keys = []; for (var k in o) { keys.push(k); } return keys;'
      )
    ).toEqual(['b', 'a', 'c']);
  });
  it('for-in puts integer keys first in ascending order', () => {
    expect(
      parity(
        'var o = { b: 1, 2: 2, a: 3, 1: 4 }; var keys = []; for (var k in o) { keys.push(k); } return keys;'
      )
    ).toEqual(['1', '2', 'b', 'a']);
  });
  it('for-in over an array gives index strings', () => {
    expect(
      parity("var keys = []; for (var i in ['x', 'y']) { keys.push(i); } return keys;")
    ).toEqual(['0', '1']);
  });
  it('string concatenation with an object', () => {
    expect(parity("return '' + { a: 1 };")).toEqual('[object Object]');
  });
  it('object compared by identity', () => {
    expect(parity('var a = {}; var b = {}; var c = a; return [a === b, a === c, a == b];')).toEqual(
      [false, true, false]
    );
  });
  it('objects are passed by reference', () => {
    expect(parity('function set(o) { o.v = 1; } var o = {}; set(o); return o.v;')).toEqual(1);
  });
  it('typeof an object and null', () => {
    expect(parity('return [typeof {}, typeof null, typeof []];')).toEqual([
      'object',
      'object',
      'object'
    ]);
  });
  it('object with a method property', () => {
    expect(
      parity('var o = { add: function (a, b) { return a + b; } }; return o.add(2, 3);')
    ).toEqual(5);
  });
  it('computed property names from variables', () => {
    expect(parity("var k = 'dyn'; var o = {}; o[k + 1] = 'v'; return o;")).toEqual({ dyn1: 'v' });
  });
  it('property names that are keywords', () => {
    expect(
      parity('var o = { if: 1, class: 2, default: 3 }; return o.if + o.class + o.default;')
    ).toEqual(6);
  });
  it('counting words into an object', () => {
    expect(
      parity(
        "var words = ['a', 'b', 'a', 'c', 'a']; var counts = {}; for (var i = 0; i < words.length; i++) { var w = words[i]; counts[w] = (counts[w] || 0) + 1; } return counts;"
      )
    ).toEqual({ a: 3, b: 1, c: 1 });
  });
  it('reading data objects', () => {
    expect(
      parity('return user.name + " is " + user.age;', { user: { name: 'Ada', age: 36 } })
    ).toEqual('Ada is 36');
  });
  it('copying data into a new object', () => {
    expect(
      parity('var copy = {}; for (var k in source) { copy[k] = source[k] * 2; } return copy;', {
        source: { a: 1, b: 2 }
      })
    ).toEqual({ a: 2, b: 4 });
  });
  it('double negation coerces to boolean', () => {
    expect(parity("return [!!'', !!'a', !!0, !!-1, !!{}];")).toEqual([
      false,
      true,
      false,
      true,
      true
    ]);
  });
});

describe('undefined', () => {
  it('reading a missing property gives undefined', () => {
    expect(parity('var o = { a: 1 }; return [o.b === undefined, typeof o.b];')).toEqual([
      true,
      'undefined'
    ]);
  });
});

describe('Object', () => {
  it('Object.keys of an object', () => {
    expect(parity('return Object.keys({ b: 1, a: 2, 10: 3, 2: 4 });')).toEqual([
      '2',
      '10',
      'b',
      'a'
    ]);
  });
  it('Object called as a function makes an empty object', () => {
    expect(parity('var o = Object(); o.a = 1; return o;')).toEqual({ a: 1 });
  });
  it('new Object makes an empty object', () => {
    expect(parity('var o = new Object(); o.b = 2; return o;')).toEqual({ b: 2 });
  });
  it('Object of an object returns it unchanged', () => {
    expect(parity('var o = { a: 1 }; return Object(o) === o;')).toEqual(true);
  });
});

describe('Object.keys', () => {
  it('Object.keys of an array', () => {
    expect(parity("return Object.keys(['a', 'b', 'c']);")).toEqual(['0', '1', '2']);
  });
  it('Object.keys after delete', () => {
    expect(parity('var o = { a: 1, b: 2, c: 3 }; delete o.b; return Object.keys(o);')).toEqual([
      'a',
      'c'
    ]);
  });
});

describe('Object.getOwnPropertyNames', () => {
  it('Object.getOwnPropertyNames of an object', () => {
    expect(parity('return Object.getOwnPropertyNames({ x: 1, y: 2 });')).toEqual(['x', 'y']);
  });
  it('Object.getOwnPropertyNames of an array includes length', () => {
    expect(parity('return Object.getOwnPropertyNames([7, 8]);')).toEqual(['0', '1', 'length']);
  });
});

describe('Object.prototype.hasOwnProperty', () => {
  it('hasOwnProperty', () => {
    expect(
      parity(
        "var o = { a: 1, b: undefined }; return [o.hasOwnProperty('a'), o.hasOwnProperty('b'), o.hasOwnProperty('c'), o.hasOwnProperty('hasOwnProperty')];"
      )
    ).toEqual([true, true, false, false]);
  });
  it('hasOwnProperty converts its key', () => {
    expect(
      parity('var o = { 1: true }; return [o.hasOwnProperty(1), o.hasOwnProperty("1")];')
    ).toEqual([true, true]);
  });
  it('hasOwnProperty on data', () => {
    expect(
      parity("return [config.hasOwnProperty('mode'), config.hasOwnProperty('other')];", {
        config: { mode: 'fast' }
      })
    ).toEqual([true, false]);
  });
});

describe('Object.prototype.toString', () => {
  it('toString of a plain object', () => {
    expect(parity('return ({ a: 1 }).toString();')).toEqual('[object Object]');
  });
});

describe('Object.prototype.toLocaleString', () => {
  it('toLocaleString of a plain object', () => {
    expect(parity('return ({}).toLocaleString();')).toEqual('[object Object]');
  });
});

describe('Object.prototype.valueOf', () => {
  it('valueOf of a plain object returns the object', () => {
    expect(parity('var o = { a: 1 }; return [o.valueOf() === o, o.valueOf().a];')).toEqual([
      true,
      1
    ]);
  });
});

describe('String', () => {
  it('String of an object', () => {
    expect(parity('return String({});')).toEqual('[object Object]');
  });
  it('toString of a boolean', () => {
    expect(parity('var t = true; return [t.toString(), String(false)];')).toEqual([
      'true',
      'false'
    ]);
  });
});

describe('Boolean', () => {
  it('Boolean with no argument', () => {
    expect(parity('return Boolean();')).toEqual(false);
  });
});

describe('NaN', () => {
  it('Boolean as a function', () => {
    expect(
      parity(
        "return [Boolean(0), Boolean(''), Boolean('0'), Boolean(NaN), Boolean({}), Boolean([]), Boolean(null), Boolean(undefined), Boolean(1)];"
      )
    ).toEqual([false, false, true, false, true, true, false, false, true]);
  });
});
