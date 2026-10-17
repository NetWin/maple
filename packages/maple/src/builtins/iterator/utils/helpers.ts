import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

/** The wrapped iterator with the host's helper methods, whatever kind of iterator it is. */
export function helpers(wrapper: IteratorWrapper): IteratorObject<unknown> {
  return Iterator.from(wrapper.iterator);
}
