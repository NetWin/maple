import type { Fail } from './members.ts';

/**
 * Runs a host write on an array that is no longer extensible, where the host refuses exactly what
 * JavaScript refuses, as `push` does but `pop` does not. Its `TypeError` becomes the script's.
 * Only host code may run inside, so a `TypeError` can only be that refusal.
 */
export function guardIntegrityErrors<T>(fail: Fail, array: Array<unknown>, write: () => T): T {
  if (Object.isExtensible(array)) {
    return write();
  }
  try {
    return write();
  } catch (error) {
    if (error instanceof TypeError) {
      return fail(error.name, error.message);
    }
    throw error;
  }
}
