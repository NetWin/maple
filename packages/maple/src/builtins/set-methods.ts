import { toString } from '../values/coercion.ts';
import { type CallContext, isCallable, type Method, method } from '../values/native.ts';
import { asMutableOrThrow, IteratorWrapper, MapWrapper, SetWrapper } from '../values/wrappers.ts';

type SetMethod = Method<SetWrapper>;

/**
 * Membership is the host `Set`'s SameValueZero over sandbox values. The set algebra methods
 * accept a Set or a Map, unwrapped before the host sees it, so no script member is ever called.
 */
export const SET_METHODS: ReadonlyMap<string, SetMethod> = new Map<string, SetMethod>([
  [
    'add',
    method(Set.prototype.add.length, (s, [value], { fail }) => {
      asMutableOrThrow(s, fail, 'add').set.add(value);
      return s;
    })
  ],
  [
    'clear',
    method(Set.prototype.clear.length, (s, _args, { fail }) =>
      asMutableOrThrow(s, fail, 'clear').set.clear()
    )
  ],
  [
    'delete',
    method(Set.prototype.delete.length, (s, [value], { fail }) =>
      asMutableOrThrow(s, fail, 'delete').set.delete(value)
    )
  ],
  [
    'difference',
    method(
      Set.prototype.difference.length,
      (s, [other], { fail }) =>
        new SetWrapper(s.set.difference(asSetLikeOrThrow(other, fail, 'difference')))
    )
  ],
  ['entries', method(Set.prototype.entries.length, (s) => new IteratorWrapper(s.set.entries()))],
  [
    'forEach',
    method(Set.prototype.forEach.length, (s, [fn], context) => {
      if (!isCallable(fn)) {
        return context.fail('TypeError', `${toString(fn)} is not a function`);
      }
      for (const value of s.set) {
        context.call(fn, [value, value, s]);
      }
      return undefined;
    })
  ],
  ['has', method(Set.prototype.has.length, (s, [value]) => s.set.has(value))],
  [
    'intersection',
    method(
      Set.prototype.intersection.length,
      (s, [other], { fail }) =>
        new SetWrapper(s.set.intersection(asSetLikeOrThrow(other, fail, 'intersection')))
    )
  ],
  [
    'isDisjointFrom',
    method(Set.prototype.isDisjointFrom.length, (s, [other], { fail }) =>
      s.set.isDisjointFrom(asSetLikeOrThrow(other, fail, 'isDisjointFrom'))
    )
  ],
  [
    'isSubsetOf',
    method(Set.prototype.isSubsetOf.length, (s, [other], { fail }) =>
      s.set.isSubsetOf(asSetLikeOrThrow(other, fail, 'isSubsetOf'))
    )
  ],
  [
    'isSupersetOf',
    method(Set.prototype.isSupersetOf.length, (s, [other], { fail }) =>
      s.set.isSupersetOf(asSetLikeOrThrow(other, fail, 'isSupersetOf'))
    )
  ],

  ['keys', method(Set.prototype.keys.length, (s) => new IteratorWrapper(s.set.values()))],
  [
    'symmetricDifference',
    method(
      Set.prototype.symmetricDifference.length,
      (s, [other], { fail }) =>
        new SetWrapper(
          s.set.symmetricDifference(asSetLikeOrThrow(other, fail, 'symmetricDifference'))
        )
    )
  ],
  [
    'union',
    method(
      Set.prototype.union.length,
      (s, [other], { fail }) => new SetWrapper(s.set.union(asSetLikeOrThrow(other, fail, 'union')))
    )
  ],
  ['values', method(Set.prototype.values.length, (s) => new IteratorWrapper(s.set.values()))]
]);

/** The language accepts any object with `size`, `has` and `keys`; Maple only its own collections. */
function asSetLikeOrThrow(
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
