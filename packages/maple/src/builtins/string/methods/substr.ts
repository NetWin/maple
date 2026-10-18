// oxlint-disable typescript/no-deprecated -- Annex B legacy, deprecated in favour of slice, not broken
import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

/** A missing length stays missing, since `NaN` would mean an empty result. */
export const STRING_METHOD_SUBSTR: Method<string> = method(
  String.prototype.substr.length,
  (s, [start, length]) =>
    s.substr(toNumber(start), length === undefined ? undefined : toNumber(length))
);
