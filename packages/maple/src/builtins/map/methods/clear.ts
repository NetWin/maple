import { method, type Method } from '../../../values/native.ts';
import type { MapWrapper } from '../../../values/wrappers/map-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export const MAP_METHOD_CLEAR: Method<MapWrapper> = method(
  Map.prototype.clear.length,
  (m, _args, { fail }) => asMutableOrThrow(m, fail, 'clear').map.clear()
);
