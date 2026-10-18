import { method, type Method } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { closeIterator } from '../utils/close-iterator.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

/** In-house, so an empty iterator without a start value is a catchable `TypeError`. */
export const ITERATOR_METHOD_REDUCE: Method<IteratorWrapper> = method(
  Iterator.prototype.reduce.length,
  (iter, args, context) => {
    const call = iteratorCallback(args[0], iter, context);
    let index = 0;
    let accumulator: unknown;

    if (args.length > 1) {
      accumulator = args[1];
    } else {
      const first = iter.iterator.next();
      if (first.done === true) {
        return context.fail('TypeError', 'Reduce of empty iterator with no initial value');
      }
      accumulator = first.value;
      index = 1;
    }

    for (let step = iter.iterator.next(); step.done !== true; step = iter.iterator.next()) {
      // Only the reducer's error closes the iterator; one from next() leaves it as it is
      try {
        accumulator = call(accumulator, step.value, index);
      } catch (error) {
        closeIterator(iter);
        throw error;
      }
      index++;
    }

    return accumulator;
  }
);
