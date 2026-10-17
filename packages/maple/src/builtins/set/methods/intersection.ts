import { method, type Method } from '../../../values/native.ts';
import { SetWrapper } from '../../../values/wrappers.ts';
import { asSetLikeOrThrow } from '../utils/as-set-like-or-throw.ts';

export const SET_METHOD_INTERSECTION: Method<SetWrapper> = method(
  Set.prototype.intersection.length,
  (s, [other], { fail }) =>
    new SetWrapper(s.set.intersection(asSetLikeOrThrow(other, fail, 'intersection')))
);
