import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_ENTRIES: Method<MapWrapper> = method(
  Map.prototype.entries.length,
  (m) => new IteratorWrapper(m.map.entries())
);
