import { method, type Method } from '../../../values/native.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export const MAP_METHOD_SET: Method<MapWrapper> = method(
  Map.prototype.set.length,
  (m, [key, value], { fail }) => {
    asMutableOrThrow(m, fail, 'set').map.set(key, value);
    return m;
  }
);
