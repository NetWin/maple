import { toNumber } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers.ts';
import { helpers } from '../utils/helpers.ts';

export const ITERATOR_METHOD_DROP: Method<IteratorWrapper> = method(
  Iterator.prototype.drop.length,
  (i, [count], { fail }) =>
    new IteratorWrapper(guardHostErrors(fail, () => helpers(i).drop(toNumber(count))))
);
