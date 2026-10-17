import { toString } from '../../../values/coercion.ts';
import { isCallable, method, type Method } from '../../../values/native.ts';
import { type MapWrapper } from '../../../values/wrappers.ts';

export const MAP_METHOD_FOR_EACH: Method<MapWrapper> = method(
  Map.prototype.forEach.length,
  (m, [fn], context) => {
    if (!isCallable(fn)) {
      return context.fail('TypeError', `${toString(fn)} is not a function`);
    }

    for (const [key, value] of m.map) {
      context.call(fn, [value, key, m]);
    }

    return undefined;
  }
);
