import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';

export const MAP_METHOD_ENTRIES: Method<MapWrapper> = method(
  Map.prototype.entries.length,
  (m) => new IteratorWrapper(m.map.entries())
);
