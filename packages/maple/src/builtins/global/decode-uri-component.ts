import { toString } from '../../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../../values/native.ts';

/** Throws a `URIError` on malformed input, which the script may catch. */
export const GLOBAL_DECODE_URI_COMPONENT: NativeFunction = new NativeFunction(
  'decodeURIComponent',
  () => decodeURIComponent.length,
  (_, [text], { fail }) => guardHostErrors(fail, () => decodeURIComponent(toString(text)))
);
