import { describe, expect, it } from 'vitest';
import type { Fail } from './members.ts';
import { guardHostErrors } from './native.ts';

const fail: Fail = (name, message) => {
  throw new Error(`${name}: ${message}`);
};

describe('guardHostErrors', () => {
  it('turns the errors the spec requires into sandbox errors', () => {
    expect(() =>
      guardHostErrors(fail, () => {
        throw new RangeError('Invalid string length');
      })
    ).toThrow('RangeError: Invalid string length');
    expect(() => guardHostErrors(fail, () => decodeURIComponent('%'))).toThrow(/^URIError: /);
    expect(guardHostErrors(fail, () => 1)).toBe(1);
  });

  it('lets the host running out of stack end the run', () => {
    const overflow = new RangeError('Maximum call stack size exceeded');

    expect(() =>
      guardHostErrors(fail, () => {
        throw overflow;
      })
    ).toThrow(overflow);
    expect(() =>
      guardHostErrors(fail, () => {
        throw new TypeError('not a spec-required error here');
      })
    ).toThrow(TypeError);
  });
});
