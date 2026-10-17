import type { NativeFunction } from '../../values/native.ts';
import { STRING_STATIC_FROM_CHAR_CODE } from './statics/from-char-code.ts';
import { STRING_STATIC_FROM_CODE_POINT } from './statics/from-code-point.ts';

/** The `String.*` functions. */
export const STRING_STATICS: Readonly<Record<string, NativeFunction>> = {
  fromCharCode: STRING_STATIC_FROM_CHAR_CODE,
  fromCodePoint: STRING_STATIC_FROM_CODE_POINT
};
