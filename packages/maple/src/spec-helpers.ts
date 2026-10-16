import { MapleError } from './boundary/maple-error.ts';
import type { Maple } from './maple.ts';

/** Runs `code` and returns the `MapleError` it throws, failing the test if it doesn't throw. */
export function runAndCatch(maple: Maple, code: string, data?: unknown): MapleError {
  try {
    maple.run(code, data);
  } catch (error) {
    if (error instanceof MapleError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected run to throw');
}
