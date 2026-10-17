import { toString } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const DATE_STATIC_PARSE: NativeFunction = new NativeFunction(
  'parse',
  Date.parse.length,
  (_, [text]) => Date.parse(toString(text))
);
