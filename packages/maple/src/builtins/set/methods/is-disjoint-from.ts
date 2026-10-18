import { method, type Method } from '../../../values/native.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';
import { asSetLikeOrThrow } from '../utils/as-set-like-or-throw.ts';

export const SET_METHOD_IS_DISJOINT_FROM: Method<SetWrapper> = method(
  Set.prototype.isDisjointFrom.length,
  (s, [other], { fail }) => s.set.isDisjointFrom(asSetLikeOrThrow(other, fail, 'isDisjointFrom'))
);
