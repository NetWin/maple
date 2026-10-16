import { toString } from '../values/coercion.ts';
import { type CallContext, isCallable, type Method } from '../values/native.ts';
import { asMutableOrThrow, IteratorWrapper, MapWrapper, SetWrapper } from '../values/wrappers.ts';

type SetMethod = Method<SetWrapper>;

/**
 * Membership is the host `Set`'s SameValueZero over sandbox values. The set algebra methods
 * accept a Set or a Map, unwrapped before the host sees it, so no script member is ever called.
 */
export const SET_METHODS: ReadonlyMap<string, SetMethod> = new Map<string, SetMethod>([
  [
    'add',
    (s, [value], { fail }) => {
      asMutableOrThrow(s, fail, 'add').set.add(value);
      return s;
    }
  ],
  ['clear', (s, _args, { fail }) => asMutableOrThrow(s, fail, 'clear').set.clear()],
  ['delete', (s, [value], { fail }) => asMutableOrThrow(s, fail, 'delete').set.delete(value)],
  [
    'difference',
    (s, [other], { fail }) =>
      new SetWrapper(s.set.difference(asSetLikeOrThrow(other, fail, 'difference')))
  ],
  ['entries', (s) => new IteratorWrapper(s.set.entries())],
  [
    'forEach',
    (s, [fn], context) => {
      if (!isCallable(fn)) {
        return context.fail('TypeError', `${toString(fn)} is not a function`);
      }
      for (const value of s.set) {
        context.call(fn, [value, value, s]);
      }
      return undefined;
    }
  ],
  ['has', (s, [value]) => s.set.has(value)],
  [
    'intersection',
    (s, [other], { fail }) =>
      new SetWrapper(s.set.intersection(asSetLikeOrThrow(other, fail, 'intersection')))
  ],
  [
    'isDisjointFrom',
    (s, [other], { fail }) => s.set.isDisjointFrom(asSetLikeOrThrow(other, fail, 'isDisjointFrom'))
  ],
  [
    'isSubsetOf',
    (s, [other], { fail }) => s.set.isSubsetOf(asSetLikeOrThrow(other, fail, 'isSubsetOf'))
  ],
  [
    'isSupersetOf',
    (s, [other], { fail }) => s.set.isSupersetOf(asSetLikeOrThrow(other, fail, 'isSupersetOf'))
  ],

  ['keys', (s) => new IteratorWrapper(s.set.values())],
  [
    'symmetricDifference',
    (s, [other], { fail }) =>
      new SetWrapper(
        s.set.symmetricDifference(asSetLikeOrThrow(other, fail, 'symmetricDifference'))
      )
  ],
  [
    'union',
    (s, [other], { fail }) => new SetWrapper(s.set.union(asSetLikeOrThrow(other, fail, 'union')))
  ],
  ['values', (s) => new IteratorWrapper(s.set.values())]
]);

/** The language accepts any object with `size`, `has` and `keys`; Maple only its own collections. */
function asSetLikeOrThrow(
  other: unknown,
  fail: CallContext['fail'],
  method: string
): ReadonlySetLike<unknown> {
  if (other instanceof SetWrapper) {
    return other.set;
  }
  if (other instanceof MapWrapper) {
    return other.map;
  }
  return fail('TypeError', `Set.prototype.${method} expects a Set or a Map`);
}
