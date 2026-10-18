import { toString } from '../../../values/coercion.ts';
import { type CallContext, isCallable } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { closeIterator } from './close-iterator.ts';

export type IteratorCallback = (...args: Array<unknown>) => unknown;

/**
 * Checked before the host sees it, since a host `TypeError` would surface as an internal error.
 * A callback that is not callable closes the iterator first, as JavaScript does.
 */
export function iteratorCallback(
  fn: unknown,
  wrapper: IteratorWrapper,
  context: CallContext
): IteratorCallback {
  if (!isCallable(fn)) {
    closeIterator(wrapper);
    return context.fail('TypeError', `${toString(fn)} is not a function`);
  }
  return (...args) => context.call(fn, args);
}
