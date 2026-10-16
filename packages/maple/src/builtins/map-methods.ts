import { toString } from '../values/coercion.ts';
import { isCallable, type Method } from '../values/native.ts';
import { asMutableOrThrow, IteratorWrapper, MapWrapper } from '../values/wrappers.ts';

type MapMethod = Method<MapWrapper>;

/** Key identity and SameValueZero equality are the host `Map`'s; the entries are sandbox values. */
export const MAP_METHODS: ReadonlyMap<string, MapMethod> = new Map<string, MapMethod>([
  ['clear', (m, _args, { fail }) => asMutableOrThrow(m, fail, 'clear').map.clear()],
  ['delete', (m, [key], { fail }) => asMutableOrThrow(m, fail, 'delete').map.delete(key)],
  ['entries', (m) => new IteratorWrapper(m.map.entries())],
  [
    'forEach',
    (m, [fn], context) => {
      if (!isCallable(fn)) {
        return context.fail('TypeError', `${toString(fn)} is not a function`);
      }
      for (const [key, value] of m.map) {
        context.call(fn, [value, key, m]);
      }
      return undefined;
    }
  ],
  ['get', (m, [key]) => m.map.get(key)],
  ['has', (m, [key]) => m.map.has(key)],
  ['keys', (m) => new IteratorWrapper(m.map.keys())],
  [
    'set',
    (m, [key, value], { fail }) => {
      asMutableOrThrow(m, fail, 'set').map.set(key, value);
      return m;
    }
  ],
  ['values', (m) => new IteratorWrapper(m.map.values())]
]);
