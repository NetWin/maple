import { afterEach, describe, expect, it, vi } from 'vitest';

describe('host support', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('loads and runs scripts on a host without the Iterator global', async () => {
    vi.stubGlobal('Iterator', undefined);
    vi.resetModules();
    const { Maple } = await import('./index.ts');

    const { value } = new Maple().run('return [1, 2, 3].map((x) => x * 2).join();');

    expect(value).toBe('2,4,6');
  });
});
