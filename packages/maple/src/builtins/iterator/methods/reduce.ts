import { method, type Method } from '../../../values/native.ts';
import { type IteratorWrapper } from '../../../values/wrappers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

/** In-house, so an empty iterator without a start value is a catchable `TypeError`. */
export const ITERATOR_METHOD_REDUCE: Method<IteratorWrapper> = method(
  Iterator.prototype.reduce.length,
  (i, args, context) => {
    const call = iteratorCallback(args[0], context);
    let index = 0;
    let accumulator: unknown;

    if (args.length > 1) {
      accumulator = args[1];
    } else {
      const first = i.iterator.next();
      if (first.done === true) {
        return context.fail('TypeError', 'Reduce of empty iterator with no initial value');
      }
      accumulator = first.value;
      index = 1;
    }

    for (let step = i.iterator.next(); step.done !== true; step = i.iterator.next()) {
      accumulator = call(accumulator, step.value, index);
      index++;
    }

    return accumulator;
  }
);
