import { MapleError } from './boundary/maple-error.ts';
import type { Maple, RunOptions } from './maple.ts';

/**
 * `run` as a JavaScript caller sees it, with any value as the code and the data. `Maple` and
 * `Sandbox` assign to it without a cast, since method parameters are compared both ways.
 */
export interface UntypedRunner {
  run(code: unknown, data?: unknown): unknown;
}

/** Runs `code` and returns the `MapleError` it throws, failing the test if it doesn't throw. */
export function runAndCatch(
  maple: Maple,
  code: string,
  data?: object,
  options?: RunOptions
): MapleError {
  try {
    maple.run(code, data, options);
  } catch (error) {
    if (error instanceof MapleError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected run to throw');
}

export function errorMessage(maple: Maple, code: string): string | undefined {
  return runAndCatch(maple, code).sandboxError?.message;
}
