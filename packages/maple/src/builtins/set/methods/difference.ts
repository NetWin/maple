import { method, type Method } from '../../../values/native.ts';
import { SetWrapper } from '../../../values/wrappers.ts';
import { asSetLikeOrThrow } from '../utils/as-set-like-or-throw.ts';

export const SET_METHOD_DIFFERENCE: Method<SetWrapper> = method(
  Set.prototype.difference.length,
  (s, [other], { fail }) =>
    new SetWrapper(s.set.difference(asSetLikeOrThrow(other, fail, 'difference')))
);
