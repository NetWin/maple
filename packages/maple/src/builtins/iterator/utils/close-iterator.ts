import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

/**
 * IteratorClose on the way out of an error: calls the iterator's `return()` if it has one and
 * ignores what it returns or throws, since the error that caused the close is what propagates.
 */
export function closeIterator(wrapper: IteratorWrapper): void {
  try {
    wrapper.iterator.return?.();
  } catch {
    // The original error wins, as JavaScript has it
  }
}
