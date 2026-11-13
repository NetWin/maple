import { toString } from '../../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../../values/native.ts';

/** Throws a `URIError` on malformed input, which the script may catch. */
export const GLOBAL_ENCODE_URI_COMPONENT: NativeFunction = new NativeFunction(
  'encodeURIComponent',
  () => encodeURIComponent.length,
  (_, [text], { fail }) => guardHostErrors(fail, () => encodeURIComponent(toString(text)))
);
