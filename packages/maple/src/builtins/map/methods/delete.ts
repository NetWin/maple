import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_DELETE: Method<MapWrapper> = method(
  Map.prototype.delete.length,
  (m, [key], { fail }) => asMutableOrThrow(m, fail, 'delete').map.delete(key)
);
