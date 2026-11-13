import { toString } from '../../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../../values/native.ts';

/** Throws a `URIError` on malformed input, which the script may catch. */
export const GLOBAL_ENCODE_URI: NativeFunction = new NativeFunction(
  'encodeURI',
  () => encodeURI.length,
  (_, [text], { fail }) => guardHostErrors(fail, () => encodeURI(toString(text)))
);
