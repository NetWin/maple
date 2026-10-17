import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_KEYS: Method<MapWrapper> = method(
  Map.prototype.keys.length,
  (m) => new IteratorWrapper(m.map.keys())
);
