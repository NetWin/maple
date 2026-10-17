import { toString } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_PARSE_FLOAT: NativeFunction = new NativeFunction(
  'parseFloat',
  Number.parseFloat.length,
  (_, [text]) => parseFloat(toString(text))
);
