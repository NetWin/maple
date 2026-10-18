import { method, type Method } from '../../../values/native.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';

export const MAP_METHOD_GET: Method<MapWrapper> = method(Map.prototype.get.length, (m, [key]) =>
  m.map.get(key)
);
