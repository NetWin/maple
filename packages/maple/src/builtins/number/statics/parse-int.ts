import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toString } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_PARSE_INT: NativeFunction = new NativeFunction(
  'parseInt',
  Number.parseInt.length,
  (_, [text, radix]) => parseInt(toString(text), optionalNumberArgument(radix))
);
