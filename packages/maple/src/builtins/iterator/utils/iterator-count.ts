import { toNumber, toString } from '../../../values/coercion.ts';
import type { CallContext } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { closeIterator } from './close-iterator.ts';

/**
 * The count of `take` and `drop`, checked before the host sees it, since only newer engines close
 * the iterator when they reject it. A count that fails to convert, is `NaN` or is negative closes
 * the iterator first, as JavaScript does.
 */
export function iteratorCount(
  count: unknown,
  wrapper: IteratorWrapper,
  context: CallContext
): number {
  let number: number;

  try {
    number = toNumber(count);
  } catch (error) {
    closeIterator(wrapper);
    throw error;
  }

  if (Number.isNaN(number) || Math.trunc(number) < 0) {
    closeIterator(wrapper);
    return context.fail('RangeError', `${toString(count)} must be positive`);
  }

  return number;
}
