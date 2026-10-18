import { method, type Method } from '../../../values/native.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';

export const MAP_METHOD_HAS: Method<MapWrapper> = method(Map.prototype.has.length, (m, [key]) =>
  m.map.has(key)
);
