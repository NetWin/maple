import { describe, expect, it } from 'vitest';
import { Scope } from './scope.ts';

describe('Scope', () => {
  it('finds bindings through the parent chain', () => {
    const outer = new Scope();
    const inner = new Scope(outer);
    outer.define('a', 'var');

    expect(inner.lookup('a')).toBe(outer.lookup('a'));
    expect(inner.lookup('b')).toBeUndefined();
  });

  it('starts let and const uninitialized and everything else initialized', () => {
    const scope = new Scope();
    scope.define('a', 'let');
    scope.define('b', 'const');
    scope.define('c', 'var');
    scope.define('d', 'global', 4);

    expect(scope.lookup('a')?.initialized).toBe(false);
    expect(scope.lookup('b')?.initialized).toBe(false);
    expect(scope.lookup('c')).toMatchObject({ initialized: true, value: undefined });
    expect(scope.lookup('d')).toMatchObject({ initialized: true, value: 4 });
  });

  it('initializes the nearest binding, which for var is the scope it hoisted to', () => {
    const outer = new Scope();
    const inner = new Scope(outer);
    outer.define('a', 'var');
    inner.define('b', 'let');

    inner.initialize('a', 1);
    inner.initialize('b', 2);

    expect(outer.lookup('a')).toMatchObject({ initialized: true, value: 1 });
    expect(inner.lookup('b')).toMatchObject({ initialized: true, value: 2 });
  });

  it('shadows a parent binding with its own', () => {
    const outer = new Scope();
    const inner = new Scope(outer);
    outer.define('a', 'global', 1);
    inner.define('a', 'let');
    inner.initialize('a', 2);

    expect(inner.lookup('a')?.value).toBe(2);
    expect(outer.lookup('a')?.value).toBe(1);
  });
});
