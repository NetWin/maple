// oxlint-disable typescript/no-deprecated -- Annex B legacy, deprecated in favour of the URI functions, not broken
import { toString } from '../../values/coercion.ts';
import { NativeFunction } from '../../values/native.ts';

/** Reverses `escape`; anything that is no escape sequence stays as it is. */
export const GLOBAL_UNESCAPE: NativeFunction = new NativeFunction(
  'unescape',
  unescape.length,
  (_, [value]) => unescape(toString(value))
);
