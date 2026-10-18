import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCount } from '../utils/iterator-count.ts';

export const ITERATOR_METHOD_TAKE: Method<IteratorWrapper> = method(
  Iterator.prototype.take.length,
  (i, [count], context) => new IteratorWrapper(helpers(i).take(iteratorCount(count, i, context)))
);
