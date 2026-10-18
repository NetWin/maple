import { describe, expect, it, vi } from 'vitest';
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

  describe('defineLazy', () => {
    it('defines an initialized var binding without creating its value', () => {
      const scope = new Scope();
      const create = vi.fn<() => unknown>(() => 1);
      scope.defineLazy('a', create);

      expect(scope.lookup('a')).toMatchObject({ kind: 'var', initialized: true });
      expect(create).not.toHaveBeenCalled();
    });

    it('creates the value on the first read and keeps it for every later one', () => {
      const scope = new Scope();
      const create = vi.fn<() => unknown>(() => ({ created: true }));
      scope.defineLazy('a', create);

      const first = scope.lookup('a')?.value;

      expect(first).toEqual({ created: true });
      expect(scope.lookup('a')?.value).toBe(first);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('lets an assignment replace the value without ever creating it', () => {
      const scope = new Scope();
      const create = vi.fn<() => unknown>(() => 1);
      scope.defineLazy('a', create);
      const binding = scope.lookup('a');
      if (!binding) {
        throw new Error('expected a binding');
      }

      binding.value = 2;

      expect(binding.value).toBe(2);
      expect(create).not.toHaveBeenCalled();
    });

    it('creates the value once when read through a child scope', () => {
      const outer = new Scope();
      const inner = new Scope(outer);
      const create = vi.fn<() => unknown>(() => 1);
      outer.defineLazy('a', create);

      expect(inner.lookup('a')?.value).toBe(1);
      expect(outer.lookup('a')?.value).toBe(1);
      expect(create).toHaveBeenCalledTimes(1);
    });
  });
});
