import { describe, expect, it } from 'vitest';
import { MapleError } from './maple-error.ts';

describe('MapleError', () => {
  it('is an Error with a stable name and a code', () => {
    const error = new MapleError('RUNTIME_ERROR', 'boom');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MapleError');
    expect(error.code).toBe('RUNTIME_ERROR');
    expect(error.message).toBe('boom');
    expect(error.line).toBeUndefined();
    expect(error.column).toBeUndefined();
    expect(error.stats).toBeUndefined();
  });

  it('carries position, sandbox error, cause and stats when given', () => {
    const cause = new RangeError('host');
    const stats = { ops: 3, maxDepth: 1, durationMs: 0.5 };
    const error = new MapleError('INTERNAL_ERROR', 'boom', {
      line: 2,
      column: 4,
      sandboxError: { name: 'TypeError', message: 'nope', stack: '' },
      cause,
      stats
    });

    expect(error.line).toBe(2);
    expect(error.column).toBe(4);
    expect(error.sandboxError).toMatchObject({ name: 'TypeError', message: 'nope' });
    expect(error.cause).toBe(cause);
    expect(error.stats).toEqual(stats);
  });
});
