import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_MAP: Method<IteratorWrapper> = method(
  Iterator.prototype.map.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, i, context);
    return new IteratorWrapper(helpers(i).map((value, index) => call(value, index)));
  }
);
