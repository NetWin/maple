import { method, type Method } from '../../../values/native.ts';
import { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';
import { asSetLikeOrThrow } from '../utils/as-set-like-or-throw.ts';

export const SET_METHOD_UNION: Method<SetWrapper> = method(
  Set.prototype.union.length,
  (s, [other], { fail }) => new SetWrapper(s.set.union(asSetLikeOrThrow(other, fail, 'union')))
);
