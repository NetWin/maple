import { method, type Method } from '../../../values/native.ts';
import { type SetWrapper } from '../../../values/wrappers.ts';
import { asSetLikeOrThrow } from '../utils/as-set-like-or-throw.ts';

export const SET_METHOD_IS_SUPERSET_OF: Method<SetWrapper> = method(
  Set.prototype.isSupersetOf.length,
  (s, [other], { fail }) => s.set.isSupersetOf(asSetLikeOrThrow(other, fail, 'isSupersetOf'))
);
