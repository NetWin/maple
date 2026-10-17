import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_VALUES: Method<MapWrapper> = method(
  Map.prototype.values.length,
  (m) => new IteratorWrapper(m.map.values())
);
