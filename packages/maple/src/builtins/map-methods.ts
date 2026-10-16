import { toString } from '../values/coercion.ts';
import { isCallable, type Method, method } from '../values/native.ts';
import { asMutableOrThrow, IteratorWrapper, MapWrapper } from '../values/wrappers.ts';

type MapMethod = Method<MapWrapper>;

/** Key identity and SameValueZero equality are the host `Map`'s; the entries are sandbox values. */
export const MAP_METHODS: ReadonlyMap<string, MapMethod> = new Map<string, MapMethod>([
  [
    'clear',
    method(Map.prototype.clear.length, (m, _args, { fail }) =>
      asMutableOrThrow(m, fail, 'clear').map.clear()
    )
  ],
  [
    'delete',
    method(Map.prototype.delete.length, (m, [key], { fail }) =>
      asMutableOrThrow(m, fail, 'delete').map.delete(key)
    )
  ],
  ['entries', method(Map.prototype.entries.length, (m) => new IteratorWrapper(m.map.entries()))],
  [
    'forEach',
    method(Map.prototype.forEach.length, (m, [fn], context) => {
      if (!isCallable(fn)) {
        return context.fail('TypeError', `${toString(fn)} is not a function`);
      }
      for (const [key, value] of m.map) {
        context.call(fn, [value, key, m]);
      }
      return undefined;
    })
  ],
  ['get', method(Map.prototype.get.length, (m, [key]) => m.map.get(key))],
  ['has', method(Map.prototype.has.length, (m, [key]) => m.map.has(key))],
  ['keys', method(Map.prototype.keys.length, (m) => new IteratorWrapper(m.map.keys()))],
  [
    'set',
    method(Map.prototype.set.length, (m, [key, value], { fail }) => {
      asMutableOrThrow(m, fail, 'set').map.set(key, value);
      return m;
    })
  ],
  ['values', method(Map.prototype.values.length, (m) => new IteratorWrapper(m.map.values()))]
]);
