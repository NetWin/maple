import { toString } from '../../../values/coercion.ts';
import { asHostIterable } from '../../../values/iteration.ts';
import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_FLAT_MAP: Method<IteratorWrapper> = method(
  Iterator.prototype.flatMap.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, context);
    return new IteratorWrapper(
      helpers(i).flatMap((value, index) => {
        const inner = call(value, index);
        // `flatMap` flattens iterables but, as the language specifies, not strings
        const iterable = typeof inner === 'string' ? undefined : asHostIterable(inner);
        if (!iterable) {
          return context.fail('TypeError', `${toString(inner)} is not an iterable object`);
        }
        return iterable;
      })
    );
  }
);
