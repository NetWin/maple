import { describe, expect, it, vi } from 'vitest';
import { defineOwn } from './own-property.ts';

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
