// oxlint-disable typescript/no-deprecated -- Annex B legacy, deprecated in favour of the URI functions, not broken
import { toString } from '../../values/coercion.ts';
import { NativeFunction } from '../../values/native.ts';

/** The legacy encoding of Annex B, which every host Maple runs on has. */
export const GLOBAL_ESCAPE: NativeFunction = new NativeFunction(
  'escape',
  escape.length,
  (_, [value]) => escape(toString(value))
);
