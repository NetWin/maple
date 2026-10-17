import type { CallContext } from '../../../values/native.ts';
import { MapWrapper, SetWrapper } from '../../../values/wrappers.ts';

/** The language accepts any object with `size`, `has` and `keys`; Maple only its own collections. */
export function asSetLikeOrThrow(
  other: unknown,
  fail: CallContext['fail'],
  methodName: string
): ReadonlySetLike<unknown> {
  if (other instanceof SetWrapper) {
    return other.set;
  }
  if (other instanceof MapWrapper) {
    return other.map;
  }
  return fail('TypeError', `Set.prototype.${methodName} expects a Set or a Map`);
}
