import { describe, expect, it, vi } from 'vitest';
import { defineOwn, ownDataValue } from './own-property.ts';

const DATA_PROPERTY = { enumerable: true, writable: true, configurable: true };

describe('defineOwn', () => {
  it('adds a new key as a writable, enumerable, configurable data property', () => {
    const target = {};
    defineOwn(target, 'a', 1);

    expect(Object.getOwnPropertyDescriptor(target, 'a')).toEqual({ value: 1, ...DATA_PROPERTY });
  });

  it('keeps __proto__ a plain own key and leaves the prototype alone', () => {
    const target = {};
    defineOwn(target, '__proto__', { polluted: true });

    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(target, '__proto__')).toEqual({
      value: { polluted: true },
      ...DATA_PROPERTY
    });
  });

  it('shadows inherited names with own data properties', () => {
    const target = {};
    defineOwn(target, 'toString', 1);
    defineOwn(target, 'hasOwnProperty', 2);
    defineOwn(target, 'constructor', 3);

    expect(Object.getOwnPropertyDescriptor(target, 'toString')).toEqual({
      value: 1,
      ...DATA_PROPERTY
    });
    expect(Object.getOwnPropertyDescriptor(target, 'hasOwnProperty')).toEqual({
      value: 2,
      ...DATA_PROPERTY
    });
    expect(Object.getOwnPropertyDescriptor(target, 'constructor')).toEqual({
      value: 3,
      ...DATA_PROPERTY
    });
  });

  it('extends an array when the index is past its end', () => {
    const target = [1];
    defineOwn(target, '3', 4);

    expect(target).toHaveLength(4);
    expect(Object.getOwnPropertyDescriptor(target, '3')).toEqual({ value: 4, ...DATA_PROPERTY });
  });

  it('works on an object without a prototype', () => {
    const target: object = Object.create(null);
    defineOwn(target, 'a', 1);
    defineOwn(target, '__proto__', 2);

    expect(Object.getOwnPropertyDescriptor(target, 'a')).toEqual({ value: 1, ...DATA_PROPERTY });
    expect(Object.getOwnPropertyDescriptor(target, '__proto__')).toEqual({
      value: 2,
      ...DATA_PROPERTY
    });
  });

  it('throws on a non-extensible target', () => {
    expect(() => defineOwn(Object.preventExtensions({}), 'a', 1)).toThrow(TypeError);
    expect(() => defineOwn(Object.preventExtensions({}), 'toString', 1)).toThrow(TypeError);
  });

  it('does not call an inherited setter', () => {
    const set = vi.fn<(value: unknown) => void>();
    const target: object = Object.create(Object.defineProperty({}, 'probe', { set }));
    defineOwn(target, 'probe', 1);

    expect(set).not.toHaveBeenCalled();
    expect(Object.getOwnPropertyDescriptor(target, 'probe')).toEqual({
      value: 1,
      ...DATA_PROPERTY
    });
  });
});

describe('ownDataValue', () => {
  it('returns the value of an own data property, enumerable or not', () => {
    const target = Object.defineProperty({ a: 1 }, 'hidden', { value: 2 });

    const values = [ownDataValue(target, 'a'), ownDataValue(target, 'hidden')];

    expect(values).toEqual([1, 2]);
  });

  it('returns undefined for a missing key and for one the prototype answers', () => {
    const target = {};

    const values = [ownDataValue(target, 'a'), ownDataValue(target, 'hasOwnProperty')];

    expect(values).toEqual([undefined, undefined]);
  });

  it('returns undefined for an own accessor without calling it', () => {
    const get = vi.fn<() => unknown>(() => 1);
    const target = Object.defineProperty({}, 'probe', { get });

    const value = ownDataValue(target, 'probe');

    expect(value).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it('returns undefined for an own accessor even when the host prototype carries a value', () => {
    const get = vi.fn<() => unknown>(() => 'host');
    const target = Object.defineProperty({}, 'probe', {
      get,
      enumerable: true,
      configurable: true
    });
    // oxlint-disable-next-line no-extend-native -- stands in for a host page that polluted the prototype
    Object.defineProperty(Object.prototype, 'value', { value: 'polluted', configurable: true });

    let result: unknown;
    try {
      result = ownDataValue(target, 'probe');
    } finally {
      Reflect.deleteProperty(Object.prototype, 'value');
    }

    expect(result).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it('returns undefined for an array hole and for an index past the end', () => {
    // oxlint-disable-next-line no-sparse-arrays -- the hole is what is being read
    const target = [1, , 3];

    const values = [
      ownDataValue(target, '0'),
      ownDataValue(target, '1'),
      ownDataValue(target, '5')
    ];

    expect(values).toEqual([1, undefined, undefined]);
  });
});
