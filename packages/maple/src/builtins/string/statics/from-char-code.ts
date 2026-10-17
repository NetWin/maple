import { toNumber } from '../../../values/coercion.ts';
import { NativeFunction } from '../../../values/native.ts';

export const STRING_STATIC_FROM_CHAR_CODE: NativeFunction = new NativeFunction(
  'fromCharCode',
  String.fromCharCode.length,
  (_, codes) => codes.map((code) => String.fromCharCode(toNumber(code))).join('')
);
