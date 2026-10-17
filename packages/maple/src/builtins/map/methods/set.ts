import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_SET: Method<MapWrapper> = method(
  Map.prototype.set.length,
  (m, [key, value], { fail }) => {
    asMutableOrThrow(m, fail, 'set').map.set(key, value);
    return m;
  }
);
