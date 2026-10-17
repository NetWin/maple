import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_CLEAR: Method<MapWrapper> = method(
  Map.prototype.clear.length,
  (m, _args, { fail }) => asMutableOrThrow(m, fail, 'clear').map.clear()
);
