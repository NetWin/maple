import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Maple, MapleErrorCode } from './index.ts';

describe('host support', () => {
  describe('on a host without the Iterator global and Set.prototype.union', () => {
    // oxlint-disable-next-line typescript/unbound-method -- only kept to be put back, never called
    const union = Set.prototype.union;
    let maple: Maple;
    let errorCode: typeof MapleErrorCode;

    beforeAll(async () => {
      vi.stubGlobal('Iterator', undefined);
      Reflect.deleteProperty(Set.prototype, 'union');
      vi.resetModules();
      const module = await import('./index.ts');
      maple = new module.Maple();
      errorCode = module.MapleErrorCode;
    });

    afterAll(() => {
      vi.unstubAllGlobals();
      // oxlint-disable-next-line no-extend-native -- puts back the host's own method removed above
      Object.defineProperty(Set.prototype, 'union', {
        value: union,
        writable: true,
        configurable: true
      });
      vi.resetModules();
    });

    it('loads and runs scripts', () => {
      const { value } = maple.run('return [1, 2, 3].map((x) => x * 2).join();');

      expect(value).toBe('2,4,6');
    });

    it.each([
      'Iterator.from.length',
      '[1, 2].values().map((x) => x).toArray()',
      'new Set([1]).union(new Set([2]))'
    ])('ends the run with an error the script cannot catch for %s', (expression) => {
      const run = (): unknown =>
        maple.run(`try { return ${expression}; } catch { return 'caught'; }`);

      expect(run).toThrow(expect.objectContaining({ code: errorCode.INTERNAL_ERROR }));
    });

    it('runs the next script after a run ended on a missing built-in', () => {
      const failing = (): unknown => maple.run('return Iterator.from.length;');
      expect(failing).toThrow(expect.objectContaining({ code: errorCode.INTERNAL_ERROR }));

      const { value } = maple.run('return 1 + 1;');
      expect(value).toBe(2);
    });
  });
});
