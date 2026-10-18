import { toBoolean } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_FILTER: Method<IteratorWrapper> = method(
  Iterator.prototype.filter.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, i, context);
    return new IteratorWrapper(helpers(i).filter((value, index) => toBoolean(call(value, index))));
  }
);
