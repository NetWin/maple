import { describe, expect, it } from 'vitest';
import { NativeFunction } from '../values/native.ts';
import { DateWrapper } from '../values/wrappers/date-wrapper.ts';
import { MapWrapper } from '../values/wrappers/map-wrapper.ts';
import { RegExpWrapper } from '../values/wrappers/regexp-wrapper.ts';
import { SetWrapper } from '../values/wrappers/set-wrapper.ts';
import { fromHost } from './from-host.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads a nested value without type assertions; arrays are indexed by their stringified index. */
function at(value: unknown, ...path: Array<string>): unknown {
  let current = value;
  for (const key of path) {
    current = isRecord(current) ? current[key] : undefined;
  }
  return current;
}

const one = (): number => 1;

function firstEntry(map: ReadonlyMap<unknown, unknown>): [unknown, unknown] {
  const [first] = [...map];
  if (!first) {
    throw new Error('expected an entry');
  }
  return first;
}

/** A regexp whose `lastIndex` holds whatever the host left in it. */
function withLastIndex(lastIndex: unknown): RegExp {
  const regexp = /a/g;
  // @ts-expect-error - assigning a host object to lastIndex is normally not allowed in TypeScript
  regexp.lastIndex = lastIndex;
  return regexp;
}

describe('fromHost', () => {
  it('passes primitives through, including the ones JSON would lose', () => {
    expect(fromHost(1)).toBe(1);
    expect(fromHost('a')).toBe('a');
    expect(fromHost(true)).toBe(true);
    expect(fromHost(null)).toBe(null);
    expect(fromHost(undefined)).toBe(undefined);
    expect(fromHost(Number.NaN)).toBeNaN();
    expect(fromHost(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(Object.is(fromHost(-0), -0)).toBe(true);
  });

  it('copies plain objects and arrays deeply and freezes the copy', () => {
    const source = { a: { b: [1, { c: 2 }] } };
    const copy = fromHost(source);

    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(at(copy, 'a')).not.toBe(source.a);
    expect(at(copy, 'a', 'b')).not.toBe(source.a.b);
    expect(Object.isFrozen(copy)).toBe(true);
    expect(Object.isFrozen(at(copy, 'a'))).toBe(true);
    expect(Object.isFrozen(at(copy, 'a', 'b'))).toBe(true);
    expect(Object.isFrozen(at(copy, 'a', 'b', '1'))).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it('accepts null-prototype objects and gives the copy a normal prototype', () => {
    const source: Record<string, unknown> = Object.create(null);
    source['a'] = 1;
    const copy = fromHost(source);

    expect(copy).toEqual({ a: 1 });
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
  });

  it('keeps a __proto__ key as an own property without touching the prototype', () => {
    const source: unknown = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}');
    const copy = fromHost(source);

    expect(isRecord(copy) && Object.getOwnPropertyNames(copy)).toEqual(['__proto__', 'a']);
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect('polluted' in {}).toBe(false);
  });

  it('preserves cycles and shared references', () => {
    const shared = { x: 1 };
    const source: { self?: unknown; a: unknown; b: unknown } = { a: shared, b: shared };
    source.self = source;
    const copy = fromHost(source);

    expect(at(copy, 'self')).toBe(copy);
    expect(at(copy, 'a')).toBe(at(copy, 'b'));
    expect(at(copy, 'a')).not.toBe(shared);
  });

  it('preserves shared Dates and RegExps', () => {
    const date = new Date(0);
    const regexp = /a/g;
    const copy = fromHost({ dates: [date, date], regexps: [regexp, regexp] });

    expect(at(copy, 'dates', '0')).toBe(at(copy, 'dates', '1'));
    expect(at(copy, 'regexps', '0')).toBe(at(copy, 'regexps', '1'));
  });

  it('keeps holes and named properties of arrays', () => {
    // oxlint-disable-next-line no-sparse-arrays -- the hole is what is tested
    const sparse = fromHost([, 2]);
    const match = fromHost(/(?<x>b)/.exec('ab'));

    expect(Array.isArray(sparse) && [sparse.length, 0 in sparse, sparse[1]]).toEqual([2, false, 2]);
    expect([at(match, 'index'), at(match, 'input'), at(match, 'groups', 'x')]).toEqual([
      1,
      'ab',
      'b'
    ]);
    expect(() => fromHost(Object.assign([1], { extra: Symbol('s') }), 'data')).toThrow(
      new TypeError('Unsupported value at data.extra: symbol')
    );
  });

  it('rejects values outside the model with the path to them', () => {
    class Thing {
      public readonly id = 1;
    }

    expect(() => fromHost({ a: { b: new Thing() } }, 'data')).toThrow(
      new TypeError('Unsupported value at data.a.b: Thing')
    );
    expect(() => fromHost([1, Symbol('s')], 'data')).toThrow(
      new TypeError('Unsupported value at data[1]: symbol')
    );
    expect(() => fromHost(new Uint8Array(1), 'data')).toThrow(
      new TypeError('Unsupported value at data: Uint8Array')
    );
    expect(() => fromHost(Object('boxed'), 'data')).toThrow(
      new TypeError('Unsupported value at data: String')
    );
  });

  it('rejects values nested deeper than 1000 levels, as toHost does', () => {
    // A Map's key is one level down like its value and converted first, so it is the one named
    const builders: Array<[string, string, (inner: unknown) => unknown]> = [
      ['[0]', '', (inner) => [inner]],
      ['.a', '', (inner) => ({ a: inner })],
      ['[1]', ' (key)', (inner) => new Map([[1, inner]])],
      ['{0}', '', (inner) => new Set([inner])]
    ];

    for (const [segment, suffix, wrap] of builders) {
      let value: unknown = 0;
      for (let i = 0; i < 1000; i++) {
        value = wrap(value);
      }
      expect(() => fromHost(value)).not.toThrow();
      expect(() => fromHost(wrap(value))).toThrow(
        new TypeError(
          `Unsupported value at value${segment.repeat(1001)}${suffix}: nested deeper than 1000 levels`
        )
      );
    }
  });

  it('rejects a RegExp whose lastIndex is not a number', () => {
    expect(() => fromHost({ r: withLastIndex({ n: 1 }) }, 'data')).toThrow(
      new TypeError('Unsupported value at data.r.lastIndex: Object')
    );
    expect(() => fromHost(withLastIndex('1'), 'data')).toThrow(
      new TypeError('Unsupported value at data.lastIndex: string')
    );
    expect(() => fromHost(withLastIndex(null), 'data')).toThrow(
      new TypeError('Unsupported value at data.lastIndex: object')
    );
    expect(() =>
      fromHost(
        withLastIndex(() => 1),
        'data'
      )
    ).toThrow(new TypeError('Unsupported value at data.lastIndex: function'));
    const copy = fromHost(withLastIndex(Number.NaN));
    expect(copy instanceof RegExpWrapper && copy.regexp.lastIndex).toBeNaN();
  });

  it('wraps Date, RegExp, Map and Set as read-only copies with converted contents', () => {
    const date = fromHost(new Date(5));
    expect(date).toBeInstanceOf(DateWrapper);
    expect(date instanceof DateWrapper && [date.date.getTime(), date.readOnly]).toEqual([5, true]);

    const source = /a/g;
    source.lastIndex = 1;
    const regexp = fromHost(source);
    expect(regexp instanceof RegExpWrapper && regexp.regexp).not.toBe(source);
    expect(
      regexp instanceof RegExpWrapper && [regexp.regexp.flags, regexp.regexp.lastIndex]
    ).toEqual(['g', 1]);

    const inner = { n: 1 };
    const map = fromHost(new Map([[inner, [inner]]]));
    const [key, value] = firstEntry(map instanceof MapWrapper ? map.map : new Map());
    expect(key).not.toBe(inner);
    expect(key).toEqual(inner);
    expect(Object.isFrozen(key)).toBe(true);
    expect(at(value, '0')).toBe(key);
    expect(map instanceof MapWrapper && map.readOnly).toBe(true);

    const set = fromHost(new Set([1]));
    expect(set instanceof SetWrapper && [...set.set]).toEqual([1]);
  });

  it('leaves the copy mutable when asked, for values a script will own', () => {
    const copy = fromHost({ list: [1], when: new Date(0) }, 'value', { freeze: false });

    expect(Object.isFrozen(copy)).toBe(false);
    expect(Object.isFrozen(at(copy, 'list'))).toBe(false);
    const when = at(copy, 'when');
    expect(when instanceof DateWrapper && when.readOnly).toBe(false);
  });

  it('turns functions into native function values, unless told not to', () => {
    const converted = fromHost({ fn: one, again: one }, 'globals');

    expect(at(converted, 'fn')).toBeInstanceOf(NativeFunction);
    expect(at(converted, 'fn')).toBe(at(converted, 'again'));
    expect(() => fromHost(one, 'result', { functions: false })).toThrow(
      new TypeError('Unsupported value at result: function')
    );
  });
});
