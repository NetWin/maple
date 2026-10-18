import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';

export const MAP_METHOD_VALUES: Method<MapWrapper> = method(
  Map.prototype.values.length,
  (m) => new IteratorWrapper(m.map.values())
);
