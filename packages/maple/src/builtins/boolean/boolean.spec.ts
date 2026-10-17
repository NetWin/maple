import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('Boolean as a function', () => {
  it('converts hook-free', () => {
    expect(run('return Boolean("");')).toBe(false);
    expect(run('return Boolean(obj);', { obj: {} })).toBe(true);
    expect(run('return Boolean();')).toBe(false);
  });

  it('cannot be constructed, as there are no wrapper objects', () => {
    expect(runAndCatch(maple, 'new Boolean(false);').code).toBe('DISALLOWED_SYNTAX');
  });
});

describe('boolean methods', () => {
  it('convert a boolean to its name and give back its value', () => {
    expect(run('return [true.toString(), false.toString(), true.valueOf()];')).toEqual([
      'true',
      'false',
      true
    ]);
  });
});
